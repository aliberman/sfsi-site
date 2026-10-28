import { decodeIdToken } from "arctic";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isStaff, startSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { oauthClient, resolveOAuthUser } from "@/lib/oauth";
import { profileFromClaims } from "@/lib/oauth-profile";
import { safeNext } from "@/lib/safe-next";

export const dynamic = "force-dynamic";

// Completes a Google/Microsoft sign-in started by ../route.ts.
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const jar = cookies();
  const expectedState = jar.get("oauth_state")?.value;
  const verifier = jar.get("oauth_verifier")?.value;
  const next = jar.get("oauth_next")?.value;
  const linking = jar.get("oauth_link")?.value === "1";
  for (const name of ["oauth_state", "oauth_verifier", "oauth_next", "oauth_link"]) jar.delete(name);

  const failTo = linking ? "/portal/account" : "/login";
  const fail = (message: string) => {
    const url = new URL(failTo, req.url);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  };

  const oauth = oauthClient(params.provider);
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!oauth) return fail("That sign-in option isn’t available.");
  if (req.nextUrl.searchParams.get("error")) return fail("Sign-in was cancelled.");
  if (!code || !state || !expectedState || !verifier || state !== expectedState) {
    return fail("Your sign-in expired. Please try again.");
  }

  let claims: Record<string, unknown>;
  try {
    const tokens = await oauth.client.validateAuthorizationCode(code, verifier);
    // The ID token comes straight from the provider's token endpoint over TLS.
    claims = decodeIdToken(tokens.idToken()) as Record<string, unknown>;
  } catch (err) {
    console.error(`[oauth] ${oauth.provider} code exchange failed`, err);
    return fail("We couldn’t complete sign-in. Please try again.");
  }

  let profile;
  try {
    profile = profileFromClaims(oauth.provider, claims);
  } catch {
    return fail("We couldn’t read your account details.");
  }

  const current = linking ? await getCurrentUser() : null;
  if (linking && !current) return fail("Please sign in first.");
  const result = await resolveOAuthUser(profile, current?.id);
  if ("error" in result) return fail(result.error);

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, result.userId) });
  if (!user) return fail("We couldn’t find your account.");
  await startSession(user);
  const destination = linking ? "/portal/account?connected=1" : safeNext(next, isStaff(user) ? "/admin" : "/portal");
  return NextResponse.redirect(new URL(destination, req.url));
}
