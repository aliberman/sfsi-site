import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isStaff, type CurrentUser } from "@/lib/auth";
import { addDays, formatTime, todayIso } from "@/lib/format";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

export async function logActivity(eventId: string, actorId: string | null, action: string, conn: Db = db) {
  await conn.insert(schema.activity).values({ eventId, actorId, action });
}

/** Loads an event the user may act on: their own, or any event for operators. */
export async function getAccessibleEvent(user: CurrentUser, eventId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;
  const event = await db.query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!event) return null;
  if (event.ownerId !== user.id && !isStaff(user)) return null;
  return event;
}

/** The family may edit the intake details until office staff lock them (or the event is over). */
export function familyCanEditDetails(event: { detailsLockedAt: Date | null; status: string }) {
  return !event.detailsLockedAt && event.status !== "completed" && event.status !== "cancelled";
}

/** Statuses in which the client may still change service and catering requests. */
export function clientCanEdit(status: string) {
  return status === "draft" || status === "submitted" || status === "quoted";
}

const ACTIVE_STATUSES = ["submitted", "quoted", "booked", "in_production"] as const;

/**
 * Units of each tracked catalog item already allocated to other active events on the
 * same date. Used to warn operators before double-booking SFSI-owned equipment.
 */
export async function allocatedOnDate(eventDate: string, excludeEventId?: string) {
  const rows = await db
    .select({
      catalogItemId: schema.equipmentAllocations.catalogItemId,
      quantity: schema.equipmentAllocations.quantity,
    })
    .from(schema.equipmentAllocations)
    .innerJoin(schema.events, eq(schema.events.id, schema.equipmentAllocations.eventId))
    .where(
      and(
        eq(schema.events.eventDate, eventDate),
        inArray(schema.events.status, [...ACTIVE_STATUSES]),
        excludeEventId ? ne(schema.events.id, excludeEventId) : undefined,
      ),
    );
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.catalogItemId, (totals.get(r.catalogItemId) ?? 0) + r.quantity);
  return totals;
}

/**
 * Turns an accepted quote into operational work: equipment allocations for tracked
 * rentals, staffing and vendor tasks per line, and the standard run-up checklist
 * scheduled relative to the event date.
 */
export async function provisionFromQuote(tx: Tx, eventId: string, quoteId: string) {
  const event = await tx.query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!event) return;
  const lines = await tx.query.quoteLines.findMany({
    where: eq(schema.quoteLines.quoteId, quoteId),
    with: { catalogItem: true },
  });

  const eventDate = event.eventDate;
  const due = (daysBefore: number) => {
    if (!eventDate) return null;
    const d = addDays(eventDate, -daysBefore);
    return d < todayIso() ? todayIso() : d;
  };

  const newTasks: (typeof schema.tasks.$inferInsert)[] = [];
  const allocations: (typeof schema.equipmentAllocations.$inferInsert)[] = [];

  for (const line of lines) {
    switch (line.category) {
      case "equipment":
        if (line.catalogItemId && line.catalogItem?.inventoryQty != null) {
          allocations.push({ eventId, catalogItemId: line.catalogItemId, quantity: line.quantity });
        } else {
          newTasks.push({ eventId, category: "equipment", title: `Source rental: ${line.description} ×${line.quantity}`, dueDate: due(21) });
        }
        break;
      case "staffing":
        newTasks.push({ eventId, category: "staffing", title: `Assign staff: ${line.description} (${line.quantity})`, dueDate: due(14) });
        break;
      case "catering":
        newTasks.push({ eventId, category: "catering", title: `Confirm caterer & menu: ${line.description}`, dueDate: due(21) });
        break;
      case "decor":
      case "service":
      case "venue":
        newTasks.push({ eventId, category: "vendor", title: `Book & confirm: ${line.description}`, dueDate: due(30) });
        break;
    }
  }

  newTasks.push(
    { eventId, category: "planning", title: "Kickoff call with family", dueDate: due(60) },
    { eventId, category: "logistics", title: "Venue walkthrough & floor plan", dueDate: due(30) },
    { eventId, category: "planning", title: "Collect final guest count", dueDate: due(10) },
    { eventId, category: "logistics", title: "Confirm vendor arrival times & load-in", dueDate: due(5) },
    { eventId, category: "logistics", title: "Publish staff call sheet", dueDate: due(3) },
    { eventId, category: "equipment", title: "Post-event breakdown & equipment return", dueDate: eventDate },
  );

  if (newTasks.length) await tx.insert(schema.tasks).values(newTasks);
  if (allocations.length) await tx.insert(schema.equipmentAllocations).values(allocations);

  const wedding = event.type === "wedding";
  const keyTimes: (typeof schema.scheduleItems.$inferInsert)[] = [
    event.venueAccessTime && { eventId, time: formatTime(event.venueAccessTime), title: "Venue access: load-in & setup crew arrival", clientVisible: false },
    event.cocktailsTime && { eventId, time: formatTime(event.cocktailsTime), title: wedding ? "Kabbalas Panim / cocktails" : "Reception / cocktails" },
    event.ceremonyTime && { eventId, time: formatTime(event.ceremonyTime), title: wedding ? "Chuppah" : event.type === "bris" ? "Bris" : "Ceremony" },
    event.dessertTime && { eventId, time: formatTime(event.dessertTime), title: "Dessert" },
    event.venueOutTime && { eventId, time: formatTime(event.venueOutTime), title: "Breakdown complete: must be out of venue", clientVisible: false },
  ].filter((x): x is typeof schema.scheduleItems.$inferInsert => Boolean(x));
  if (keyTimes.length) {
    await tx.insert(schema.scheduleItems).values(keyTimes);
  } else if (event.startTime) {
    await tx.insert(schema.scheduleItems).values([
      { eventId, time: "3 hrs before start", title: "Load-in & setup crew arrival", clientVisible: false },
      { eventId, time: "2 hrs before start", title: "Caterer & mashgiach arrival", clientVisible: false },
      { eventId, time: formatTime(event.startTime), title: "Guests arrive" },
    ]);
  }
}
