import type { IntakeValues, VenueOption } from "@/components/EventIntakeForm";

const FIELDS = [
  "id", "title", "type", "eventDate", "guestCount", "venueId", "packageId", "budget", "contactName", "contactEmail", "contactPhone",
  "groomName", "groomParents", "brideName", "brideParents",
  "groomContactName", "groomContactPhone", "groomContactEmail", "brideContactName", "brideContactPhone", "brideContactEmail",
  "plannerName", "plannerCompany", "plannerPhone", "plannerEmail",
  "cocktailsTime", "ceremonyTime", "dessertTime", "venueAccessTime", "venueOutTime", "notes",
] as const;

/** Copies only the form's fields, so server pages don't serialize whole event records. */
export function pickIntakeValues(event: Record<string, unknown>): IntakeValues {
  return Object.fromEntries(FIELDS.map((f) => [f, event[f] ?? null])) as IntakeValues;
}

const VENUE_FIELDS = ["id", "name", "address", "contactName", "contactPhone", "contactEmail", "capacity", "active"] as const;

export function pickVenueOptions(venues: Record<string, unknown>[]): VenueOption[] {
  return venues.map((v) => Object.fromEntries(VENUE_FIELDS.map((f) => [f, v[f] ?? null])) as VenueOption);
}

/**
 * Venue choices for a family: listed venues without their internal contacts,
 * plus the private venue their own event uses (which they may edit).
 */
export function pickFamilyVenueOptions(venues: Record<string, unknown>[], ownVenueId?: string | null): VenueOption[] {
  return pickVenueOptions(venues.filter((v) => v.active || v.id === ownVenueId)).map((v) =>
    v.active ? { ...v, contactName: null, contactPhone: null, contactEmail: null } : v,
  );
}
