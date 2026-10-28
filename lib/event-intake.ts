import "server-only";
import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { EVENT_TYPE_LABELS, toCents } from "@/lib/format";
import { int, isoDateOrNull, optStr, str, uuidOrNull } from "@/lib/forms";
import { suggestTitle } from "@/lib/intake-title";

// Shared parsing for the event intake form (operator back office and family portal).

export const INTAKE_TYPES = ["wedding", "bar_mitzvah", "bris"] as const;
export const NEW_VENUE = "__new";
const TIME = /^\d{2}:\d{2}$/;

function time(fd: FormData, key: string) {
  const v = str(fd, key);
  return TIME.test(v) ? v : null;
}

function email(fd: FormData, key: string) {
  return str(fd, key).toLowerCase() || null;
}

function eventType(fd: FormData) {
  const v = str(fd, "type");
  // Older events may use other types; keep them when edited.
  if ((schema.eventType.enumValues as readonly string[]).includes(v)) return v as (typeof schema.eventType.enumValues)[number];
  throw new Error("Choose the type of simchah.");
}

/** Fields both sides edit. Operators must give a date; families may save a draft without one. */
function parseCommon(fd: FormData, operator: boolean) {
  const type = eventType(fd);
  const title =
    str(fd, "title") ||
    suggestTitle({ type, groomName: str(fd, "groomName"), brideName: str(fd, "brideName"), contactName: str(fd, "contactName") }) ||
    EVENT_TYPE_LABELS[type];
  const eventDate = isoDateOrNull(fd, "eventDate");
  if (operator && !eventDate) throw new Error("Choose the event date.");
  const guestCount = int(fd, "guestCount");
  const wedding = type === "wedding";
  const w = (key: string) => (wedding ? optStr(fd, key) : null);
  const we = (key: string) => (wedding ? email(fd, key) : null);

  return {
    title: title.slice(0, 200),
    type,
    eventDate,
    guestCount: guestCount != null ? Math.min(Math.max(guestCount, 0), 5000) : null,
    groomName: w("groomName"),
    groomParents: w("groomParents"),
    brideName: w("brideName"),
    brideParents: w("brideParents"),
    groomContactName: w("groomContactName"),
    groomContactPhone: w("groomContactPhone"),
    groomContactEmail: we("groomContactEmail"),
    brideContactName: w("brideContactName"),
    brideContactPhone: w("brideContactPhone"),
    brideContactEmail: we("brideContactEmail"),
    plannerName: optStr(fd, "plannerName"),
    plannerCompany: optStr(fd, "plannerCompany"),
    plannerPhone: optStr(fd, "plannerPhone"),
    plannerEmail: email(fd, "plannerEmail"),
    cocktailsTime: time(fd, "cocktailsTime"),
    ceremonyTime: time(fd, "ceremonyTime"),
    dessertTime: time(fd, "dessertTime"),
    venueAccessTime: time(fd, "venueAccessTime"),
    venueOutTime: time(fd, "venueOutTime"),
    notes: optStr(fd, "notes"),
  };
}

/** Operators also record the family's contact details. */
export function parseOperatorIntake(fd: FormData) {
  return {
    ...parseCommon(fd, true),
    contactName: optStr(fd, "contactName"),
    contactEmail: email(fd, "contactEmail"),
    contactPhone: optStr(fd, "contactPhone"),
  };
}

/** Families also choose a package and budget. */
export function parseFamilyIntake(fd: FormData) {
  return { ...parseCommon(fd, false), packageId: uuidOrNull(fd, "packageId"), budget: toCents(fd.get("budget")) };
}

function venueDetails(fd: FormData) {
  return {
    address: optStr(fd, "venueAddress"),
    contactName: optStr(fd, "venueContactName"),
    contactPhone: optStr(fd, "venueContactPhone"),
    contactEmail: email(fd, "venueContactEmail"),
  };
}

async function createPrivateVenue(fd: FormData) {
  const name = str(fd, "venueName");
  if (!name) throw new Error("Enter the venue’s name.");
  // Private (inactive) venues are visible to operators but not listed publicly.
  const [venue] = await db.insert(schema.venues).values({ name, ...venueDetails(fd), active: false }).returning();
  revalidatePath("/admin/venues");
  return venue.id;
}

/** Operators pick or create a venue, and may update its address and contact. */
export async function resolveOperatorVenue(fd: FormData) {
  if (str(fd, "venueId") === NEW_VENUE) return createPrivateVenue(fd);
  const venueId = uuidOrNull(fd, "venueId");
  if (venueId && fd.has("venueAddress")) {
    await db.update(schema.venues).set(venueDetails(fd)).where(eq(schema.venues.id, venueId));
  }
  return venueId;
}

/** True when a venue is a private one used by this event alone, so the family may edit it. */
export async function isFamilyEditableVenue(venueId: string, eventId: string) {
  const venue = await db.query.venues.findFirst({ where: eq(schema.venues.id, venueId) });
  if (!venue || venue.active) return false;
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.events)
    .where(and(eq(schema.events.venueId, venueId), ne(schema.events.id, eventId)));
  return n === 0;
}

/**
 * Families choose a listed venue (read-only) or describe their own, which is saved
 * as a private venue only their event uses. They never edit shared venue records.
 */
export async function resolveFamilyVenue(fd: FormData, eventId?: string) {
  if (str(fd, "venueId") === NEW_VENUE) return createPrivateVenue(fd);
  const venueId = uuidOrNull(fd, "venueId");
  if (!venueId) return null;
  const venue = await db.query.venues.findFirst({ where: eq(schema.venues.id, venueId) });
  if (!venue) return null;
  if (venue.active) return venue.id;
  // A private venue: only the event it belongs to may select or edit it.
  if (!eventId || !(await isFamilyEditableVenue(venue.id, eventId))) throw new Error("That venue isn’t available.");
  const name = str(fd, "venueName");
  await db.update(schema.venues).set({ ...(name ? { name } : {}), ...venueDetails(fd) }).where(eq(schema.venues.id, venue.id));
  return venue.id;
}
