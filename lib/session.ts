import { SignJWT, jwtVerify } from "jose";

// Session token helpers (used by server code).

export const SESSION_COOKIE = "sfsi_session";

export type SessionPayload = { sub: string; role: string };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload, days: number) {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role };
  } catch (err) {
    // A missing secret is a deployment problem, not a bad cookie: make it visible in logs.
    if (err instanceof Error && err.message.includes("AUTH_SECRET")) console.error(`[session] ${err.message}`);
    return null;
  }
}
