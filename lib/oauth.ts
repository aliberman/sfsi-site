import "server-only";
import { Google, MicrosoftEntraId } from "arctic";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { claimEventsFor } from "@/lib/events";
import { siteUrl } from "@/lib/notify";
import type { OAuthProfile, OAuthProvider } from "@/lib/oauth-profile";

export const PROVIDER_LABELS: Record<OAuthProvider, string> = { google: "Google", microsoft: "Microsoft" };

const callback = (provider: OAuthProvider) => siteUrl(`/api/auth/${provider}/callback`);

/** The configured client for a provider, or null when its credentials aren't set. */
export function oauthClient(provider: string) {
  if (provider === "google") {
    const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret } = process.env;
    if (!id || !secret) return null;
    return { provider: "google" as const, client: new Google(id, secret, callback("google")), scopes: ["openid", "email", "profile"] };
  }
  if (provider === "microsoft") {
    const { MICROSOFT_CLIENT_ID: id, MICROSOFT_CLIENT_SECRET: secret, MICROSOFT_TENANT_ID: tenant = "common" } = process.env;
    if (!id || !secret) return null;
    return {
      provider: "microsoft" as const,
      client: new MicrosoftEntraId(tenant, id, secret, callback("microsoft")),
      scopes: ["openid", "email", "profile"],
    };
  }
  return null;
}

/** Providers with credentials configured, for showing sign-in buttons. */
export function enabledProviders(): OAuthProvider[] {
  return (["google", "microsoft"] as const).filter((p) => oauthClient(p));
}

type Result = { userId: string } | { error: string };

/**
 * Finds or creates the user for a provider sign-in.
 * - A known identity signs straight in.
 * - When `linkToUserId` is set (connecting from the Account page), the identity is
 *   attached to that signed-in user.
 * - Otherwise a verified email links to an existing account, or a new account is created.
 */
export async function resolveOAuthUser(profile: OAuthProfile, linkToUserId?: string | null): Promise<Result> {
  const existing = await db.query.oauthAccounts.findFirst({
    where: and(eq(schema.oauthAccounts.provider, profile.provider), eq(schema.oauthAccounts.providerUserId, profile.providerUserId)),
  });

  if (linkToUserId) {
    if (existing && existing.userId !== linkToUserId) return { error: "That account is already connected to a different SFSI login." };
    if (!existing) {
      await db.insert(schema.oauthAccounts).values({ userId: linkToUserId, provider: profile.provider, providerUserId: profile.providerUserId, email: profile.email });
    }
    return { userId: linkToUserId };
  }

  if (existing) return { userId: existing.userId };

  const label = PROVIDER_LABELS[profile.provider];
  if (!profile.email || !profile.emailVerified) {
    return {
      error: `We couldn’t confirm the email on your ${label} account. Sign in with your email and password, then connect ${label} from your Account page.`,
    };
  }

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, profile.email) });
  const userId =
    user?.id ??
    (
      await db
        .insert(schema.users)
        .values({ email: profile.email, name: profile.name || profile.email.split("@")[0], passwordHash: null })
        .returning()
    )[0].id;
  await db.insert(schema.oauthAccounts).values({ userId, provider: profile.provider, providerUserId: profile.providerUserId, email: profile.email });
  if (!user) await claimEventsFor(userId, profile.email);
  return { userId };
}
