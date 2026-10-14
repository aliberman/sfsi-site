import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };


// Reuse one pool across hot reloads in dev. `prepare: false` keeps us compatible
// with transaction-mode poolers (Neon, Supabase) used in serverless deploys.
const sql =
  globalForDb.sql ??
  postgres(databaseUrl(), { prepare: false, max: process.env.NODE_ENV === "production" ? 5 : 10 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export { schema };
