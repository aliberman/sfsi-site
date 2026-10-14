"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { parseFamilyIntake, resolveFamilyVenue } from "@/lib/event-intake";
import { clientCanEdit, familyCanEditDetails, getAccessibleEvent, logActivity, provisionFromQuote } from "@/lib/events";
import { EVENT_TYPE_LABELS, formatDate, money, toCents } from "@/lib/format";
import { int, oneOf, optStr, str, uuidOrNull } from "@/lib/forms";
import { operatorInbox, sendEmail, siteUrl } from "@/lib/notify";
import { createOrReplacePlan, DEFAULT_PLAN } from "@/lib/plans";
import { quoteTotals } from "@/lib/quotes";
import { getStripe } from "@/lib/stripe";
import type { FormState } from "./auth";


async function ownedEvent(eventId: string) {
  const user = await requireUser();
  const event = await getAccessibleEvent(user, eventId);
  // Clients can only act on their own events here; operators use the back office.
  if (!event || event.ownerId !== user.id) throw new Error("Event not found.");
  return { user, event };
}

export async function createEvent(formData: FormData) {
  const user = await requireUser();
  const fields = parseFamilyIntake(formData);
  const venueId = await resolveFamilyVenue(formData);
  const [event] = await db
    .insert(schema.events)
    .values({ ...fields, venueId, ownerId: user.id, contactName: user.name, contactEmail: user.email, contactPhone: user.phone })
    .returning();
  await logActivity(event.id, user.id, "Created event draft");
  redirect(`/portal/events/${event.id}?tab=services`);
}

export async function updateEvent(formData: FormData) {
  const { user, event } = await ownedEvent(str(formData, "eventId"));
  if (!familyCanEditDetails(event)) {
    throw new Error("The SFSI office has locked these details. Message your coordinator to make changes.");
  }
  const fields = parseFamilyIntake(formData);
  const venueId = await resolveFamilyVenue(formData, event.id);
  await db.update(schema.events).set({ ...fields, venueId }).where(eq(schema.events.id, event.id));
  await logActivity(event.id, user.id, "Updated event details");
  // Once SFSI is working on the event, let the coordinator know the family changed something.
  if (event.status !== "draft") {
    const coordinator = event.coordinatorId
      ? await db.query.users.findFirst({ where: eq(schema.users.id, event.coordinatorId) })
      : null;
    await sendEmail(
      coordinator ? [coordinator.email] : operatorInbox(),
      `Details updated: ${fields.title}`,
      `${user.name} updated the event details for "${fields.title}".\n\n${siteUrl(`/admin/events/${event.id}`)}`,
    );
  }
  revalidatePath(`/portal/events/${event.id}`);
  revalidatePath(`/admin/events/${event.id}`);
}

export async function submitEvent(formData: FormData) {
  const { user, event } = await ownedEvent(str(formData, "eventId"));
  if (event.status !== "draft") return;
  if (!event.eventDate || !event.guestCount) {
    throw new Error("Please add an event date and estimated guest count before submitting.");
  }
  await db
    .update(schema.events)
    .set({ status: "submitted", submittedAt: new Date() })
    .where(eq(schema.events.id, event.id));
  await logActivity(event.id, user.id, "Submitted event for review");
  await sendEmail(
    operatorInbox(),
    `New event submitted: ${event.title}`,
    `${user.name} submitted "${event.title}" (${EVENT_TYPE_LABELS[event.type]}) for ${formatDate(event.eventDate)}, ~${event.guestCount} guests.\n\nReview: ${siteUrl(`/admin/events/${event.id}`)}`,
  );
  revalidatePath(`/portal/events/${event.id}`);
}

export async function cancelEvent(formData: FormData) {
  const { user, event } = await ownedEvent(str(formData, "eventId"));
  if (!clientCanEdit(event.status)) {
    throw new Error("Booked events can't be cancelled online. Please message your coordinator.");
  }
  await db.update(schema.events).set({ status: "cancelled" }).where(eq(schema.events.id, event.id));
  await logActivity(event.id, user.id, "Cancelled event");
  revalidatePath("/portal");
  redirect("/portal");
}

export async function addServiceRequest(formData: FormData) {
  const { user, event } = await ownedEvent(str(formData, "eventId"));
  if (!clientCanEdit(event.status)) throw new Error("Requests are locked once an event is booked. Message your coordinator.");
  const catalogItemId = uuidOrNull(formData, "catalogItemId");
  let description = str(formData, "description");
  if (catalogItemId) {
    const item = await db.query.catalogItems.findFirst({ where: eq(schema.catalogItems.id, catalogItemId) });
    if (!item || !item.active) throw new Error("That item is no longer available.");
    description = item.name;
  }
  if (!description) throw new Error("Describe what you need.");
  const quantity = Math.min(Math.max(int(formData, "quantity", 1) ?? 1, 1), 10000);
  await db.insert(schema.serviceRequests).values({
    eventId: event.id,
    catalogItemId,
    description: description.slice(0, 300),
    quantity,
    notes: optStr(formData, "notes"),
  });
  await logActivity(event.id, user.id, `Requested ${description} ×${quantity}`);
  revalidatePath(`/portal/events/${event.id}`);
}

export async function removeServiceRequest(formData: FormData) {
  const { event } = await ownedEvent(str(formData, "eventId"));
  if (!clientCanEdit(event.status)) throw new Error("Requests are locked once an event is booked.");
  const id = uuidOrNull(formData, "requestId");
  if (!id) return;
  await db
    .delete(schema.serviceRequests)
    .where(and(eq(schema.serviceRequests.id, id), eq(schema.serviceRequests.eventId, event.id)));
  revalidatePath(`/portal/events/${event.id}`);
}

export async function addCateringRequest(formData: FormData) {
  const { user, event } = await ownedEvent(str(formData, "eventId"));
  if (!clientCanEdit(event.status)) throw new Error("Catering requests are locked once an event is booked.");
  const guestCount = int(formData, "guestCount") ?? event.guestCount;
  if (!guestCount || guestCount < 1) throw new Error("How many guests will be eating?");
  await db.insert(schema.cateringRequests).values({
    eventId: event.id,
    mealType: oneOf(formData, "mealType", schema.mealType.enumValues),
    serviceStyle: oneOf(formData, "serviceStyle", schema.serviceStyle.enumValues),
    guestCount: Math.min(guestCount, 5000),
    hechsher: optStr(formData, "hechsher"),
    menuNotes: optStr(formData, "menuNotes"),
    dietaryNotes: optStr(formData, "dietaryNotes"),
    budgetPerGuest: toCents(formData.get("budgetPerGuest")),
  });
  await logActivity(event.id, user.id, "Requested a catering quote");
  revalidatePath(`/portal/events/${event.id}`);
}

export async function removeCateringRequest(formData: FormData) {
  const { event } = await ownedEvent(str(formData, "eventId"));
  if (!clientCanEdit(event.status)) throw new Error("Catering requests are locked once an event is booked.");
  const id = uuidOrNull(formData, "requestId");
  if (!id) return;
  await db
    .delete(schema.cateringRequests)
    .where(and(eq(schema.cateringRequests.id, id), eq(schema.cateringRequests.eventId, event.id)));
  revalidatePath(`/portal/events/${event.id}`);
}

export async function respondToQuote(formData: FormData) {
  const { user, event } = await ownedEvent(str(formData, "eventId"));
  const quoteId = uuidOrNull(formData, "quoteId");
  const decision = oneOf(formData, "decision", ["accept", "decline"] as const);
  const quote = quoteId
    ? await db.query.quotes.findFirst({
        where: and(eq(schema.quotes.id, quoteId), eq(schema.quotes.eventId, event.id)),
        with: { lines: true },
      })
    : null;
  if (!quote || quote.status !== "sent") throw new Error("This quote is no longer open.");

  if (decision === "decline") {
    await db.transaction(async (tx) => {
      await tx.update(schema.quotes).set({ status: "declined", respondedAt: new Date() }).where(eq(schema.quotes.id, quote.id));
      await tx.update(schema.events).set({ status: "submitted" }).where(eq(schema.events.id, event.id));
      await logActivity(event.id, user.id, `Declined quote #${quote.number}`, tx);
    });
    await sendEmail(operatorInbox(), `Quote #${quote.number} declined`, `${user.name} declined the quote for "${event.title}".\n${siteUrl(`/admin/events/${event.id}`)}`);
  } else {
    const { total } = quoteTotals(quote, quote.lines);
    await db.transaction(async (tx) => {
      await tx.update(schema.quotes).set({ status: "accepted", respondedAt: new Date() }).where(eq(schema.quotes.id, quote.id));
      await tx
        .update(schema.quotes)
        .set({ status: "superseded" })
        .where(and(eq(schema.quotes.eventId, event.id), inArray(schema.quotes.status, ["sent", "draft"])));
      await tx.update(schema.events).set({ status: "booked" }).where(eq(schema.events.id, event.id));
      await createOrReplacePlan(tx, { eventId: event.id, quoteId: quote.id, total, eventDate: event.eventDate, ...DEFAULT_PLAN });
      await provisionFromQuote(tx, event.id, quote.id);
      await logActivity(event.id, user.id, `Accepted quote #${quote.number} (${money(total)}) — event booked`, tx);
    });
    await sendEmail(
      operatorInbox(),
      `Booked: ${event.title}`,
      `${user.name} accepted quote #${quote.number} for "${event.title}" on ${formatDate(event.eventDate)}. A payment plan and provisioning checklist were created.\n${siteUrl(`/admin/events/${event.id}`)}`,
    );
  }
  revalidatePath(`/portal/events/${event.id}`);
}

export async function postClientMessage(formData: FormData) {
  const { user, event } = await ownedEvent(str(formData, "eventId"));
  const body = str(formData, "body");
  if (!body) return;
  await db.insert(schema.messages).values({ eventId: event.id, authorId: user.id, body: body.slice(0, 5000) });
  const coordinator = event.coordinatorId
    ? await db.query.users.findFirst({ where: eq(schema.users.id, event.coordinatorId) })
    : null;
  await sendEmail(
    coordinator ? [coordinator.email] : operatorInbox(),
    `New message about ${event.title}`,
    `${user.name} wrote:\n\n${body}\n\n${siteUrl(`/admin/events/${event.id}?tab=messages`)}`,
  );
  revalidatePath(`/portal/events/${event.id}`);
}

export async function payInstallment(formData: FormData) {
  const { user, event } = await ownedEvent(str(formData, "eventId"));
  const installmentId = uuidOrNull(formData, "installmentId");
  const stripe = getStripe();
  if (!stripe) throw new Error("Online payment isn't available yet. Please use the offline payment instructions.");
  const plan = await db.query.paymentPlans.findFirst({
    where: eq(schema.paymentPlans.eventId, event.id),
    with: { installments: true },
  });
  const installment = plan?.installments.find((i) => i.id === installmentId);
  if (!installment || installment.status !== "pending") throw new Error("This installment is not payable.");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: installment.amount,
          product_data: { name: `${event.title} — ${installment.label}` },
        },
      },
    ],
    metadata: { installmentId: installment.id, eventId: event.id },
    success_url: siteUrl(`/portal/events/${event.id}?tab=payments&paid=1`),
    cancel_url: siteUrl(`/portal/events/${event.id}?tab=payments`),
  });
  await db
    .update(schema.installments)
    .set({ stripeSessionId: session.id })
    .where(eq(schema.installments.id, installment.id));
  redirect(session.url!);
}

export async function updateAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(formData, "name");
  if (name.length < 2) return { error: "Please enter your name." };
  const updates: Partial<typeof schema.users.$inferInsert> = { name, phone: optStr(formData, "phone") };

  const newPassword = str(formData, "newPassword");
  if (newPassword) {
    if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
    const full = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
    if (!full || !(await verifyPassword(str(formData, "currentPassword"), full.passwordHash))) {
      return { error: "Your current password is incorrect." };
    }
    updates.passwordHash = await hashPassword(newPassword);
  }
  await db.update(schema.users).set(updates).where(eq(schema.users.id, user.id));
  revalidatePath("/portal", "layout");
  return { ok: "Saved." };
}
