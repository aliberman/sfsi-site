import "server-only";
import { count, countDistinct, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { averageSavings } from "@/lib/impact-math";
import { quoteTotals } from "@/lib/quotes";
import { getImpactSettings } from "@/lib/settings";

/** Live numbers for the home page impact strip. Null values are hidden. */
export async function getImpactStats() {
  const settings = await getImpactSettings();

  const [[hosted], booked, [vendorCount], [venueCount]] = await Promise.all([
    // Families hosted = distinct families with a completed simchah.
    db
      .select({ n: countDistinct(schema.events.ownerId) })
      .from(schema.events)
      .where(eq(schema.events.status, "completed")),
    // Savings use every booked-or-later event, priced by its accepted quote.
    db.query.events.findMany({
      where: inArray(schema.events.status, ["booked", "in_production", "completed"]),
      columns: { guestCount: true },
      with: { quotes: { where: eq(schema.quotes.status, "accepted"), with: { lines: true } } },
    }),
    db.select({ n: count() }).from(schema.vendors).where(eq(schema.vendors.active, true)),
    db.select({ n: count() }).from(schema.venues).where(eq(schema.venues.active, true)),
  ]);

  const families = (hosted?.n ?? 0) + settings.priorFamiliesHosted;
  const savings = averageSavings(
    booked
      .filter((e) => e.quotes.length > 0)
      .map((e) => ({ guestCount: e.guestCount, quoteTotal: quoteTotals(e.quotes[0], e.quotes[0].lines).total })),
    settings.outOfStateCostPerGuest,
  );
  const partners = (vendorCount?.n ?? 0) + (venueCount?.n ?? 0);

  return {
    families: families > 0 ? families : null,
    savings,
    partners: partners > 0 ? partners : null,
  };
}
