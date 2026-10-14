import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/** Cheap signed-in check for public chrome (no database round trip). */
export async function sessionHint() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}
