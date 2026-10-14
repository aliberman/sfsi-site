"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { requireAdmin, requireOperator } from "@/lib/auth";
import { parseOperatorIntake, resolveOperatorVenue } from "@/lib/event-intake";
import { logActivity, provisionFromQuote } from "@/lib/events";
import { EVENT_STATUS_LABELS, formatDate, label, money, PAYMENT_METHOD_LABELS, toCents } from "@/lib/format";
import { bool, int, isoDateOrNull, oneOf, optStr, str, uuidOrNull } from "@/lib/forms";
import { eventContact } from "@/lib/event-contact";
import { sendEmail, siteUrl } from "@/lib/notify";
import { createOrReplacePlan, DEFAULT_PLAN, refreshPlanStatus } from "@/lib/plans";
import { defaultQuantity, quoteTotals } from "@/lib/quotes";
import { saveSettings } from "@/lib/settings";

const eventPath = (id: string) => `/admin/events/${id}`;

async function loadEvent(fd: FormData) {
  const user = await requireOperator();
  const id = uuidOrNull(fd, "eventId");
  const event = id ? await db.query.events.findFirst({ where: eq(schema.events.id, id), with: { owner: true } }) : null;
  if (!event) throw new Error("Event not found.");
  return { user, event };
}

function done(eventId: string) {
  revalidatePath(eventPath(eventId));
  revalidatePath(`/portal/events/${eventId}`);
}

// ── Event workflow ───────────────────────────────────────────────────────────

export async function setEventStatus(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const status = oneOf(formData, "status", schema.eventStatus.enumValues);
  if (status === event.status) return;
  await db.update(schema.events).set({ status }).where(eq(schema.events.id, event.id));
  await logActivity(event.id, user.id, `Status → ${EVENT_STATUS_LABELS[status]}`);
  await sendEmail(
    eventContact(event).email ?? [],
    `Update on ${event.title}: ${EVENT_STATUS_LABELS[status]}`,
    `Your event "${event.title}" is now marked ${EVENT_STATUS_LABELS[status]}.\n\n${siteUrl(`/portal/events/${event.id}`)}`,
  );
  done(event.id);
}

// ── Operator-created events ─────────────────────────────────────────────────

/** The portal account to attach an event to, if the family already has one. */
async function accountFor(contactEmail: string | null) {
  if (!contactEmail) return null;
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, contactEmail) });
  return user?.id ?? null;
}

export async function createOperatorEvent(formData: FormData) {
  const user = await requireOperator();
  const fields = parseOperatorIntake(formData);
  const venueId = await resolveOperatorVenue(formData);
  const [event] = await db
    .insert(schema.events)
    .values({
      ...fields,
      venueId,
      ownerId: await accountFor(fields.contactEmail),
      createdById: user.id,
      coordinatorId: user.id,
      status: "submitted",
      submittedAt: new Date(),
    })
    .returning();
  await logActivity(event.id, user.id, "Created event in back office");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  redirect(eventPath(event.id));
}

export async function updateOperatorEvent(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const fields = parseOperatorIntake(formData);
  const venueId = await resolveOperatorVenue(formData);
  // Link to a portal account if the contact email now matches one; never unlink.
  const ownerId = event.ownerId ?? (await accountFor(fields.contactEmail));
  await db.update(schema.events).set({ ...fields, venueId, ownerId }).where(eq(schema.events.id, event.id));
  await logActivity(event.id, user.id, "Updated event details");
  done(event.id);
}

export async function setDetailsLock(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const lock = bool(formData, "lock");
  await db
    .update(schema.events)
    .set(lock ? { detailsLockedAt: new Date(), detailsLockedById: user.id } : { detailsLockedAt: null, detailsLockedById: null })
    .where(eq(schema.events.id, event.id));
  await logActivity(event.id, user.id, lock ? "Locked event details (family view is read-only)" : "Unlocked event details for the family");
  done(event.id);
}

export async function assignCoordinator(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const coordinatorId = uuidOrNull(formData, "coordinatorId");
  await db.update(schema.events).set({ coordinatorId }).where(eq(schema.events.id, event.id));
  const coordinator = coordinatorId ? await db.query.users.findFirst({ where: eq(schema.users.id, coordinatorId) }) : null;
  await logActivity(event.id, user.id, coordinator ? `Coordinator: ${coordinator.name}` : "Coordinator unassigned");
  done(event.id);
}

export async function setRequestStatus(formData: FormData) {
  const { event } = await loadEvent(formData);
  const id = uuidOrNull(formData, "requestId");
  const status = oneOf(formData, "status", schema.requestStatus.enumValues);
  if (!id) return;
  await db
    .update(schema.serviceRequests)
    .set({ status })
    .where(and(eq(schema.serviceRequests.id, id), eq(schema.serviceRequests.eventId, event.id)));
  done(event.id);
}

// ── Quotes ───────────────────────────────────────────────────────────────────

/** Starts a draft quote prefilled from the client's requests and catalog pricing. */
export async function createQuote(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const requests = await db.query.serviceRequests.findMany({
    where: eq(schema.serviceRequests.eventId, event.id),
    with: { catalogItem: true },
  });
  const catering = await db.query.cateringRequests.findMany({ where: eq(schema.cateringRequests.eventId, event.id) });
  const pkg = event.packageId ? await db.query.packages.findFirst({ where: eq(schema.packages.id, event.packageId) }) : null;

  const lines: Omit<typeof schema.quoteLines.$inferInsert, "quoteId">[] = [];
  if (pkg) {
    lines.push({ category: "venue", description: `${pkg.name} package`, quantity: 1, unitPrice: pkg.startingPrice ?? 0 });
  }
  for (const r of requests.filter((r) => r.status !== "declined")) {
    const item = r.catalogItem;
    lines.push({
      catalogItemId: item?.id ?? null,
      category: item?.category ?? "service",
      description: r.notes ? `${r.description} — ${r.notes}` : r.description,
      quantity: item ? defaultQuantity(item.unit, event.guestCount, r.quantity) : r.quantity,
      unitPrice: item?.unitPrice ?? 0,
    });
  }
  for (const c of catering) {
    lines.push({
      category: "catering",
      description: `Catering — ${c.mealType}, ${c.serviceStyle.replace("_", " ")}${c.hechsher ? `, ${c.hechsher}` : ""}`,
      quantity: c.guestCount,
      unitPrice: c.budgetPerGuest ?? 0,
    });
  }

  const quoteId = await db.transaction(async (tx) => {
    const [quote] = await tx
      .insert(schema.quotes)
      .values({
        eventId: event.id,
        createdById: user.id,
        taxRateBps: Number(process.env.DEFAULT_TAX_BPS ?? 700),
      })
      .returning();
    if (lines.length) {
      await tx.insert(schema.quoteLines).values(lines.map((l, i) => ({ ...l, quoteId: quote.id, sortOrder: i })));
    }
    await logActivity(event.id, user.id, `Started draft quote #${quote.number}`, tx);
    return quote.id;
  });
  revalidatePath(eventPath(event.id));
  redirect(`${eventPath(event.id)}?tab=quote&quote=${quoteId}`);
}

async function loadDraftQuote(formData: FormData) {
  const ctx = await loadEvent(formData);
  const quoteId = uuidOrNull(formData, "quoteId");
  const quote = quoteId
    ? await db.query.quotes.findFirst({ where: and(eq(schema.quotes.id, quoteId), eq(schema.quotes.eventId, ctx.event.id)) })
    : null;
  if (!quote) throw new Error("Quote not found.");
  if (quote.status !== "draft") throw new Error("Only draft quotes can be edited. Duplicate it to make changes.");
  return { ...ctx, quote };
}

export async function addQuoteLine(formData: FormData) {
  const { event, quote } = await loadDraftQuote(formData);
  const catalogItemId = uuidOrNull(formData, "catalogItemId");
  const item = catalogItemId ? await db.query.catalogItems.findFirst({ where: eq(schema.catalogItems.id, catalogItemId) }) : null;
  const description = str(formData, "description") || item?.name;
  if (!description) throw new Error("Pick a catalog item or enter a description.");
  const quantity = int(formData, "quantity") ?? (item ? defaultQuantity(item.unit, event.guestCount) : 1);
  const unitPrice = toCents(formData.get("unitPrice")) ?? item?.unitPrice ?? 0;
  const [{ value: lastOrder }] = await db
    .select({ value: max(schema.quoteLines.sortOrder) })
    .from(schema.quoteLines)
    .where(eq(schema.quoteLines.quoteId, quote.id));
  await db.insert(schema.quoteLines).values({
    quoteId: quote.id,
    catalogItemId: item?.id ?? null,
    category: item?.category ?? oneOf(formData, "category", schema.catalogCategory.enumValues, "service"),
    description,
    quantity: Math.max(quantity, 0),
    unitPrice,
    sortOrder: (lastOrder ?? -1) + 1,
  });
  done(event.id);
}

export async function updateQuoteLine(formData: FormData) {
  const { event, quote } = await loadDraftQuote(formData);
  const lineId = uuidOrNull(formData, "lineId");
  if (!lineId) return;
  await db
    .update(schema.quoteLines)
    .set({
      description: str(formData, "description") || "Item",
      quantity: Math.max(int(formData, "quantity", 0) ?? 0, 0),
      unitPrice: toCents(formData.get("unitPrice")) ?? 0,
    })
    .where(and(eq(schema.quoteLines.id, lineId), eq(schema.quoteLines.quoteId, quote.id)));
  done(event.id);
}

export async function removeQuoteLine(formData: FormData) {
  const { event, quote } = await loadDraftQuote(formData);
  const lineId = uuidOrNull(formData, "lineId");
  if (!lineId) return;
  await db.delete(schema.quoteLines).where(and(eq(schema.quoteLines.id, lineId), eq(schema.quoteLines.quoteId, quote.id)));
  done(event.id);
}

export async function updateQuoteTerms(formData: FormData) {
  const { event, quote } = await loadDraftQuote(formData);
  const taxPercent = Number(str(formData, "taxPercent") || "0");
  await db
    .update(schema.quotes)
    .set({
      discount: toCents(formData.get("discount")) ?? 0,
      subsidy: toCents(formData.get("subsidy")) ?? 0,
      taxRateBps: Number.isFinite(taxPercent) ? Math.round(Math.min(Math.max(taxPercent, 0), 25) * 100) : 0,
      validUntil: isoDateOrNull(formData, "validUntil"),
      notes: optStr(formData, "notes"),
    })
    .where(eq(schema.quotes.id, quote.id));
  done(event.id);
}

export async function sendQuote(formData: FormData) {
  const { user, event, quote } = await loadDraftQuote(formData);
  const lines = await db.query.quoteLines.findMany({ where: eq(schema.quoteLines.quoteId, quote.id) });
  if (lines.length === 0) throw new Error("Add at least one line before sending.");
  const { total } = quoteTotals(quote, lines);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.quotes)
      .set({ status: "superseded" })
      .where(and(eq(schema.quotes.eventId, event.id), eq(schema.quotes.status, "sent")));
    await tx.update(schema.quotes).set({ status: "sent", sentAt: new Date() }).where(eq(schema.quotes.id, quote.id));
    if (event.status === "draft" || event.status === "submitted" || event.status === "quoted") {
      await tx.update(schema.events).set({ status: "quoted" }).where(eq(schema.events.id, event.id));
    }
    await tx.update(schema.cateringRequests).set({ status: "quoted" }).where(eq(schema.cateringRequests.eventId, event.id));
    await logActivity(event.id, user.id, `Sent quote #${quote.number} (${money(total)})`, tx);
  });
  await sendEmail(
    eventContact(event).email ?? [],
    `Your quote for ${event.title} is ready`,
    `Hi ${eventContact(event).name ?? "there"},\n\nYour quote for "${event.title}" (${money(total)}) is ready to review${quote.validUntil ? ` and is valid until ${formatDate(quote.validUntil)}` : ""}.\n\n${siteUrl(`/portal/events/${event.id}?tab=quote`)}\n\n— South Florida Simchah Initiative`,
  );
  done(event.id);
}

/** Copies a sent/declined quote into a new editable draft. */
export async function duplicateQuote(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const quoteId = uuidOrNull(formData, "quoteId");
  const source = quoteId
    ? await db.query.quotes.findFirst({
        where: and(eq(schema.quotes.id, quoteId), eq(schema.quotes.eventId, event.id)),
        with: { lines: true },
      })
    : null;
  if (!source) throw new Error("Quote not found.");
  const newId = await db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(schema.quotes)
      .values({
        eventId: event.id,
        createdById: user.id,
        discount: source.discount,
        subsidy: source.subsidy,
        taxRateBps: source.taxRateBps,
        notes: source.notes,
        validUntil: source.validUntil,
      })
      .returning();
    if (source.lines.length) {
      await tx.insert(schema.quoteLines).values(
        source.lines.map(({ id: _id, quoteId: _q, ...l }) => ({ ...l, quoteId: copy.id })),
      );
    }
    return copy.id;
  });
  revalidatePath(eventPath(event.id));
  redirect(`${eventPath(event.id)}?tab=quote&quote=${newId}`);
}

export async function deleteDraftQuote(formData: FormData) {
  const { event, quote } = await loadDraftQuote(formData);
  await db.delete(schema.quotes).where(eq(schema.quotes.id, quote.id));
  revalidatePath(eventPath(event.id));
  redirect(`${eventPath(event.id)}?tab=quote`);
}

/** Operator books the event on the client's behalf (e.g. accepted by phone). */
export async function markQuoteAccepted(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const quoteId = uuidOrNull(formData, "quoteId");
  const quote = quoteId
    ? await db.query.quotes.findFirst({
        where: and(eq(schema.quotes.id, quoteId), eq(schema.quotes.eventId, event.id)),
        with: { lines: true },
      })
    : null;
  if (!quote || quote.status !== "sent") throw new Error("Only a sent quote can be accepted.");
  const { total } = quoteTotals(quote, quote.lines);
  await db.transaction(async (tx) => {
    await tx.update(schema.quotes).set({ status: "accepted", respondedAt: new Date() }).where(eq(schema.quotes.id, quote.id));
    await tx.update(schema.events).set({ status: "booked" }).where(eq(schema.events.id, event.id));
    await createOrReplacePlan(tx, {
      eventId: event.id,
      quoteId: quote.id,
      total,
      eventDate: event.eventDate,
      ...DEFAULT_PLAN,
    });
    await provisionFromQuote(tx, event.id, quote.id);
    await logActivity(event.id, user.id, `Marked quote #${quote.number} accepted on client's behalf — event booked`, tx);
  });
  done(event.id);
}

// ── Payment plan ─────────────────────────────────────────────────────────────

export async function buildPaymentPlan(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const accepted = await db.query.quotes.findFirst({
    where: and(eq(schema.quotes.eventId, event.id), eq(schema.quotes.status, "accepted")),
    with: { lines: true },
  });
  const total = toCents(formData.get("total")) ?? (accepted ? quoteTotals(accepted, accepted.lines).total : null);
  if (!total) throw new Error("Enter a plan total (or accept a quote first).");
  await db.transaction(async (tx) => {
    await createOrReplacePlan(tx, {
      eventId: event.id,
      quoteId: accepted?.id ?? null,
      total,
      eventDate: event.eventDate,
      depositPercent: Math.min(Math.max(int(formData, "depositPercent", 25) ?? 25, 0), 100),
      installmentCount: Math.min(Math.max(int(formData, "installmentCount", 3) ?? 3, 0), 24),
      finalDueDaysBefore: Math.max(int(formData, "finalDueDaysBefore", 14) ?? 14, 0),
    });
    await logActivity(event.id, user.id, `Built payment plan for ${money(total)}`, tx);
  });
  await sendEmail(
    eventContact(event).email ?? [],
    `Payment plan for ${event.title}`,
    `Your payment schedule for "${event.title}" is ready.\n\n${siteUrl(`/portal/events/${event.id}?tab=payments`)}`,
  );
  done(event.id);
}

async function loadInstallment(formData: FormData) {
  const ctx = await loadEvent(formData);
  const id = uuidOrNull(formData, "installmentId");
  const installment = id
    ? await db.query.installments.findFirst({ where: eq(schema.installments.id, id), with: { plan: true } })
    : null;
  if (!installment || installment.plan.eventId !== ctx.event.id) throw new Error("Installment not found.");
  return { ...ctx, installment };
}

export async function recordPayment(formData: FormData) {
  const { user, event, installment } = await loadInstallment(formData);
  const method = oneOf(formData, "method", schema.paymentMethod.enumValues);
  await db
    .update(schema.installments)
    .set({ status: "paid", paidAt: new Date(), method, reference: optStr(formData, "reference") })
    .where(eq(schema.installments.id, installment.id));
  await refreshPlanStatus(installment.planId);
  await logActivity(event.id, user.id, `Recorded ${money(installment.amount)} ${label(PAYMENT_METHOD_LABELS, method)} for ${installment.label}`);
  await sendEmail(
    eventContact(event).email ?? [],
    `Payment received — ${event.title}`,
    `We received ${money(installment.amount)} for ${installment.label}. Thank you!\n\n${siteUrl(`/portal/events/${event.id}?tab=payments`)}`,
  );
  done(event.id);
}

export async function setInstallmentStatus(formData: FormData) {
  const { user, event, installment } = await loadInstallment(formData);
  const status = oneOf(formData, "status", ["pending", "waived"] as const);
  await db
    .update(schema.installments)
    .set({ status, paidAt: null, method: null, reference: null })
    .where(eq(schema.installments.id, installment.id));
  await refreshPlanStatus(installment.planId);
  await logActivity(event.id, user.id, `${installment.label} marked ${status}`);
  done(event.id);
}

export async function updateInstallment(formData: FormData) {
  const { event, installment } = await loadInstallment(formData);
  if (installment.status === "paid") throw new Error("Paid installments can't be edited.");
  const dueDate = isoDateOrNull(formData, "dueDate");
  const amount = toCents(formData.get("amount"));
  await db
    .update(schema.installments)
    .set({ dueDate: dueDate ?? installment.dueDate, amount: amount ?? installment.amount, label: str(formData, "label") || installment.label })
    .where(eq(schema.installments.id, installment.id));
  done(event.id);
}

// ── Provisioning: staff, equipment, tasks, schedule ─────────────────────────

export async function addStaffAssignment(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const staffMemberId = uuidOrNull(formData, "staffMemberId");
  const member = staffMemberId ? await db.query.staffMembers.findFirst({ where: eq(schema.staffMembers.id, staffMemberId) }) : null;
  if (!member) throw new Error("Choose a staff member.");
  await db.insert(schema.staffAssignments).values({
    eventId: event.id,
    staffMemberId: member.id,
    role: oneOf(formData, "role", schema.staffRole.enumValues, member.primaryRole),
    callTime: optStr(formData, "callTime"),
    endTime: optStr(formData, "endTime"),
    notes: optStr(formData, "notes"),
  });
  await logActivity(event.id, user.id, `Assigned ${member.name}`);
  done(event.id);
}

export async function setAssignmentStatus(formData: FormData) {
  const { event } = await loadEvent(formData);
  const id = uuidOrNull(formData, "assignmentId");
  if (!id) return;
  await db
    .update(schema.staffAssignments)
    .set({ status: oneOf(formData, "status", schema.assignmentStatus.enumValues) })
    .where(and(eq(schema.staffAssignments.id, id), eq(schema.staffAssignments.eventId, event.id)));
  done(event.id);
}

export async function removeStaffAssignment(formData: FormData) {
  const { event } = await loadEvent(formData);
  const id = uuidOrNull(formData, "assignmentId");
  if (!id) return;
  await db
    .delete(schema.staffAssignments)
    .where(and(eq(schema.staffAssignments.id, id), eq(schema.staffAssignments.eventId, event.id)));
  done(event.id);
}

export async function addAllocation(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const catalogItemId = uuidOrNull(formData, "catalogItemId");
  const quantity = int(formData, "quantity", 1) ?? 1;
  if (!catalogItemId || quantity < 1) throw new Error("Choose an item and quantity.");
  await db.insert(schema.equipmentAllocations).values({ eventId: event.id, catalogItemId, quantity, notes: optStr(formData, "notes") });
  await logActivity(event.id, user.id, "Allocated equipment");
  done(event.id);
}

export async function removeAllocation(formData: FormData) {
  const { event } = await loadEvent(formData);
  const id = uuidOrNull(formData, "allocationId");
  if (!id) return;
  await db
    .delete(schema.equipmentAllocations)
    .where(and(eq(schema.equipmentAllocations.id, id), eq(schema.equipmentAllocations.eventId, event.id)));
  done(event.id);
}

export async function addTask(formData: FormData) {
  const { event } = await loadEvent(formData);
  const title = str(formData, "title");
  if (!title) throw new Error("Task needs a title.");
  await db.insert(schema.tasks).values({
    eventId: event.id,
    title,
    category: oneOf(formData, "category", schema.taskCategory.enumValues, "planning"),
    dueDate: isoDateOrNull(formData, "dueDate"),
    assigneeId: uuidOrNull(formData, "assigneeId"),
  });
  done(event.id);
}

export async function setTaskStatus(formData: FormData) {
  const { event } = await loadEvent(formData);
  const id = uuidOrNull(formData, "taskId");
  if (!id) return;
  await db
    .update(schema.tasks)
    .set({ status: oneOf(formData, "status", schema.taskStatus.enumValues) })
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.eventId, event.id)));
  done(event.id);
  revalidatePath("/admin");
}

export async function removeTask(formData: FormData) {
  const { event } = await loadEvent(formData);
  const id = uuidOrNull(formData, "taskId");
  if (!id) return;
  await db.delete(schema.tasks).where(and(eq(schema.tasks.id, id), eq(schema.tasks.eventId, event.id)));
  done(event.id);
}

export async function addScheduleItem(formData: FormData) {
  const { event } = await loadEvent(formData);
  const time = str(formData, "time");
  const title = str(formData, "title");
  if (!time || !title) throw new Error("Schedule items need a time and title.");
  await db.insert(schema.scheduleItems).values({
    eventId: event.id,
    time,
    title,
    details: optStr(formData, "details"),
    clientVisible: bool(formData, "clientVisible"),
  });
  done(event.id);
}

export async function removeScheduleItem(formData: FormData) {
  const { event } = await loadEvent(formData);
  const id = uuidOrNull(formData, "itemId");
  if (!id) return;
  await db.delete(schema.scheduleItems).where(and(eq(schema.scheduleItems.id, id), eq(schema.scheduleItems.eventId, event.id)));
  done(event.id);
}

export async function reprovision(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const accepted = await db.query.quotes.findFirst({
    where: and(eq(schema.quotes.eventId, event.id), eq(schema.quotes.status, "accepted")),
  });
  if (!accepted) throw new Error("No accepted quote to provision from.");
  const existing = await db.query.tasks.findFirst({ where: eq(schema.tasks.eventId, event.id) });
  if (existing) throw new Error("This event already has a checklist. Add tasks individually instead.");
  await db.transaction(async (tx) => {
    await provisionFromQuote(tx, event.id, accepted.id);
    await logActivity(event.id, user.id, "Regenerated provisioning checklist", tx);
  });
  done(event.id);
}

export async function postOperatorMessage(formData: FormData) {
  const { user, event } = await loadEvent(formData);
  const body = str(formData, "body");
  if (!body) return;
  const internal = bool(formData, "internal");
  await db.insert(schema.messages).values({ eventId: event.id, authorId: user.id, body: body.slice(0, 5000), internal });
  if (!internal) {
    await sendEmail(
      eventContact(event).email ?? [],
      `New message about ${event.title}`,
      `${user.name} from SFSI wrote:\n\n${body}\n\n${siteUrl(`/portal/events/${event.id}?tab=messages`)}`,
    );
  }
  done(event.id);
}

// ── Reference data ───────────────────────────────────────────────────────────

export async function saveCatalogItem(formData: FormData) {
  await requireOperator();
  const id = uuidOrNull(formData, "id");
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required.");
  const inventory = int(formData, "inventoryQty");
  const values = {
    name,
    category: oneOf(formData, "category", schema.catalogCategory.enumValues),
    unit: oneOf(formData, "unit", schema.pricingUnit.enumValues),
    unitPrice: toCents(formData.get("unitPrice")) ?? 0,
    description: optStr(formData, "description"),
    inventoryQty: inventory != null && inventory >= 0 ? inventory : null,
    active: bool(formData, "active"),
  };
  if (id) await db.update(schema.catalogItems).set(values).where(eq(schema.catalogItems.id, id));
  else await db.insert(schema.catalogItems).values(values);
  revalidatePath("/admin/catalog");
}

export async function saveStaffMember(formData: FormData) {
  await requireOperator();
  const id = uuidOrNull(formData, "id");
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required.");
  const values = {
    name,
    email: optStr(formData, "email"),
    phone: optStr(formData, "phone"),
    primaryRole: oneOf(formData, "primaryRole", schema.staffRole.enumValues),
    hourlyRate: toCents(formData.get("hourlyRate")),
    notes: optStr(formData, "notes"),
    active: bool(formData, "active"),
  };
  if (id) await db.update(schema.staffMembers).set(values).where(eq(schema.staffMembers.id, id));
  else await db.insert(schema.staffMembers).values(values);
  revalidatePath("/admin/staff");
}

export async function saveVenue(formData: FormData) {
  await requireOperator();
  const id = uuidOrNull(formData, "id");
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required.");
  const values = {
    name,
    neighborhood: optStr(formData, "neighborhood"),
    address: optStr(formData, "address"),
    contactName: optStr(formData, "contactName"),
    contactPhone: optStr(formData, "contactPhone"),
    contactEmail: optStr(formData, "contactEmail"),
    capacity: int(formData, "capacity"),
    shabbosFriendly: bool(formData, "shabbosFriendly"),
    description: optStr(formData, "description"),
    active: bool(formData, "active"),
  };
  if (id) await db.update(schema.venues).set(values).where(eq(schema.venues.id, id));
  else await db.insert(schema.venues).values(values);
  revalidatePath("/admin/venues");
  revalidatePath("/venues");
}

export async function savePackage(formData: FormData) {
  await requireOperator();
  const id = uuidOrNull(formData, "id");
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required.");
  const values = {
    name,
    tagline: optStr(formData, "tagline"),
    startingPrice: toCents(formData.get("startingPrice")),
    features: str(formData, "features").split("\n").map((s) => s.trim()).filter(Boolean),
    sortOrder: int(formData, "sortOrder", 0) ?? 0,
    active: bool(formData, "active"),
  };
  if (id) await db.update(schema.packages).set(values).where(eq(schema.packages.id, id));
  else await db.insert(schema.packages).values(values);
  revalidatePath("/admin/packages");
  revalidatePath("/packages");
  revalidatePath("/");
}

export async function setInquiryHandled(formData: FormData) {
  await requireOperator();
  const id = uuidOrNull(formData, "id");
  if (!id) return;
  await db.update(schema.inquiries).set({ handled: bool(formData, "handled") }).where(eq(schema.inquiries.id, id));
  revalidatePath("/admin/inquiries");
}

export async function setUserRole(formData: FormData) {
  const admin = await requireAdmin();
  const id = uuidOrNull(formData, "userId");
  if (!id || id === admin.id) throw new Error("You can't change your own role.");
  await db
    .update(schema.users)
    .set({ role: oneOf(formData, "role", schema.userRole.enumValues) })
    .where(eq(schema.users.id, id));
  revalidatePath("/admin/users");
}

export async function saveVendor(formData: FormData) {
  await requireOperator();
  const id = uuidOrNull(formData, "id");
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required.");
  const website = optStr(formData, "website");
  const values = {
    name,
    category: oneOf(formData, "category", schema.vendorCategory.enumValues),
    description: optStr(formData, "description"),
    website: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
    phone: optStr(formData, "phone"),
    email: optStr(formData, "email"),
    hechsher: optStr(formData, "hechsher"),
    active: bool(formData, "active"),
  };
  if (id) await db.update(schema.vendors).set(values).where(eq(schema.vendors.id, id));
  else await db.insert(schema.vendors).values(values);
  revalidatePath("/admin/vendors");
  revalidatePath("/venues");
  revalidatePath("/");
}

export async function saveImpactSettings(formData: FormData) {
  await requireOperator();
  const prior = int(formData, "priorFamiliesHosted", 0) ?? 0;
  await saveSettings({
    outOfStateCostPerGuest: toCents(formData.get("outOfStateCostPerGuest")) || null,
    priorFamiliesHosted: Math.max(prior, 0),
  });
  revalidatePath("/admin/settings");
  revalidatePath("/");
}
