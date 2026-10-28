import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { oauthClient } from "@/lib/oauth";
import { relativeRedirect } from "@/lib/relative-redirect";
import { safeNext } from "@/lib/safe-next";

export const dynamic = "force-dynamic";

const COOKIE = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };

// Starts a Google/Microsoft sign-in (or, with ?link=1, connects it to the signed-in account).
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const oauth = oauthClient(params.provider);
  if (!oauth) return relativeRedirect("/login", { error: "That sign-in option isn’t available." });

  const link = req.nextUrl.searchParams.get("link") === "1";
  if (link && !(await getCurrentUser())) return relativeRedirect("/login");

  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = oauth.client.createAuthorizationURL(state, verifier, oauth.scopes);
  url.searchParams.set("prompt", "select_account");

  const jar = cookies();
  jar.set("oauth_state", state, COOKIE);
  jar.set("oauth_verifier", verifier, COOKIE);
  jar.set("oauth_next", safeNext(req.nextUrl.searchParams.get("next"), ""), COOKIE);
  jar.set("oauth_link", link ? "1" : "", COOKIE);
  return NextResponse.redirect(url);
}
