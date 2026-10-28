import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// First line of defense: keeps signed-out visitors out of the portal and clients out of
// the back office. Every page, layout and server action also checks access on the server
// (pages render alongside layouts, so each page calls requireUser/requireOperator itself).
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const { pathname, search } = req.nextUrl;

  // If the edge runtime can't see AUTH_SECRET, fall back to a presence check and let
  // the server-side checks verify the session, rather than bouncing every visitor.
  const canVerify = Boolean(process.env.AUTH_SECRET);
  const session = token && canVerify ? await verifySession(token) : null;
  const signedIn = canVerify ? Boolean(session) : Boolean(token);

  if (!signedIn) {
    // Middleware sees the real public host, so nextUrl is safe to reuse.
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?${new URLSearchParams({ next: pathname + search })}`;
    return NextResponse.redirect(url);
  }
  if (session && pathname.startsWith("/admin") && session.role !== "operator" && session.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/portal/:path*", "/admin/:path*"] };
