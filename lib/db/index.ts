import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See README.md for setup.");
  return url;
}

// Reuse one pool across hot reloads in dev. `prepare: false` keeps us compatible
// with transaction-mode poolers (Neon, Supabase) used in serverless deploys.
const sql =
  globalForDb.sql ??
  postgres(connectionString(), { prepare: false, max: process.env.NODE_ENV === "production" ? 5 : 10 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export { schema };
