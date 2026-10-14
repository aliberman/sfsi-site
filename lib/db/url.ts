// The postgres driver forwards unknown URL query params to the server as runtime
// settings, which rejects libpq-only options such as Neon's `channel_binding`.
const LIBPQ_ONLY = ["channel_binding", "gssencmode", "connect_timeout", "options"];

export function databaseUrl(raw = process.env.DATABASE_URL) {
  if (!raw) throw new Error("DATABASE_URL is not set. See README.md for setup.");
  const url = new URL(raw);
  for (const key of LIBPQ_ONLY) url.searchParams.delete(key);
  return url.toString();
}
