import { NextResponse } from "next/server";

/**
 * Redirects to a same-site path using a *relative* Location header, so the browser
 * stays on the domain it's already on. Building an absolute URL from `req.url` breaks
 * on Netlify, where route handlers see the internal deploy host
 * (e.g. 6ae1…--sfsi.netlify.app) instead of the public domain the session cookie belongs to.
 */
export function relativeRedirect(path: string, query?: Record<string, string>) {
  const qs = query ? `?${new URLSearchParams(query)}` : "";
  return new NextResponse(null, { status: 303, headers: { Location: `${path}${qs}`, "Cache-Control": "no-store" } });
}
