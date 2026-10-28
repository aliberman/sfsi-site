/** Only allow same-site relative paths as post-login destinations (prevents open redirects). */
export function safeNext(value: unknown, fallback: string) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
