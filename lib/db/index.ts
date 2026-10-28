import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
let instance: Db | undefined;

// Connects on first use rather than at import, so `next build` (which loads every
// route) works without DATABASE_URL — e.g. Netlify deploy previews.
function getDb(): Db {
  if (!instance) {
    // Reuse one pool across hot reloads in dev. `prepare: false` keeps us compatible
    // with transaction-mode poolers (Neon, Supabase) used in serverless deploys.
    const sql =
      globalForDb.sql ??
      postgres(databaseUrl(), { prepare: false, max: process.env.NODE_ENV === "production" ? 5 : 10 });
    if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
    instance = drizzle(sql, { schema });
  }
  return instance;
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
export { schema };
