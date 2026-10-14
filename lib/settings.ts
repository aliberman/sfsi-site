import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type ImpactSettings = {
  /** Typical all-in cost per guest of an out-of-state simchah, in cents. Unset hides the savings stat. */
  outOfStateCostPerGuest: number | null;
  /** Families SFSI hosted before the portal existed, added to the live count. */
  priorFamiliesHosted: number;
};

const DEFAULTS: ImpactSettings = { outOfStateCostPerGuest: null, priorFamiliesHosted: 0 };

export async function getImpactSettings(): Promise<ImpactSettings> {
  const rows = await db.select().from(schema.settings).where(inArray(schema.settings.key, Object.keys(DEFAULTS)));
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULTS, ...values } as ImpactSettings;
}

export async function saveSettings(values: Partial<ImpactSettings>) {
  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(schema.settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value } });
  }
}
