"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { endSession, hashPassword, isStaff, startSession, verifyPassword } from "@/lib/auth";
import { claimEventsFor } from "@/lib/events";
import { safeNext } from "@/lib/safe-next";

export type FormState = { error?: string; ok?: string } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().toLowerCase().email("Please enter a valid email."),
  phone: z.string().trim().max(40).optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, phone, password } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return { error: "An account with that email already exists. Try signing in." };

  const [user] = await db
    .insert(schema.users)
    .values({ name, email, phone: phone || null, passwordHash: await hashPassword(password) })
    .returning();
  await claimEventsFor(user.id, email);
  await startSession(user);
  redirect(safeNext(formData.get("next"), "/portal"));
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter your email and password." };
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, parsed.data.email) });
  if (user && !user.passwordHash) {
    return { error: "This account signs in with Google or Microsoft. Use the button above." };
  }
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash!))) {
    return { error: "That email and password don't match our records." };
  }
  await startSession(user);
  redirect(safeNext(formData.get("next"), isStaff(user) ? "/admin" : "/portal"));
}

export async function logout() {
  endSession();
  redirect("/");
}
