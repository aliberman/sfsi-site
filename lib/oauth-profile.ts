// Pure helpers for turning provider ID-token claims into a profile we can trust.

export type OAuthProvider = "google" | "microsoft";

export type OAuthProfile = {
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  /** Only verified emails may link to an existing account or claim events. */
  emailVerified: boolean;
  name: string | null;
};

// Tenant ID Microsoft uses for personal (outlook.com, hotmail.com, live.com) accounts.
const MICROSOFT_CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

export function profileFromClaims(provider: OAuthProvider, claims: Record<string, unknown>): OAuthProfile {
  const str = (k: string) => (typeof claims[k] === "string" ? (claims[k] as string) : null);
  const sub = str("sub");
  if (!sub) throw new Error("Sign-in response had no user id.");

  if (provider === "google") {
    const email = str("email")?.toLowerCase() ?? null;
    return { provider, providerUserId: sub, email, emailVerified: Boolean(email) && claims.email_verified === true, name: str("name") };
  }

  // Microsoft: work/school tenants can set any address in `email`, so it is only
  // trusted for personal accounts or when the tenant proves domain ownership (xms_edov).
  const email = (str("email") ?? null)?.toLowerCase() ?? null;
  const verified = Boolean(email) && (str("tid") === MICROSOFT_CONSUMER_TENANT || claims.xms_edov === true || claims.xms_edov === "1");
  return { provider, providerUserId: sub, email, emailVerified: verified, name: str("name") };
}
