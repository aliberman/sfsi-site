"use server";

import { z } from "zod";
import { db, schema } from "@/lib/db";
import { operatorInbox, sendEmail } from "@/lib/notify";
import type { FormState } from "./auth";

const inquirySchema = z.object({
  kind: z.enum(["plan", "partner", "donate", "general"]).default("general"),
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().max(200).optional(),
  guestCount: z.coerce.number().int().min(0).max(5000).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().max(5000).optional(),
  website: z.string().optional(), // honeypot
});

export async function submitInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { website, ...data } = parsed.data;
  if (website) return { ok: "Thank you! We'll be in touch soon." };

  await db.insert(schema.inquiries).values({
    ...data,
    phone: data.phone || null,
    subject: data.subject || null,
    message: data.message || null,
    guestCount: data.guestCount ?? null,
  });
  await sendEmail(
    operatorInbox(),
    `New ${data.kind} inquiry from ${data.name}`,
    `${data.name} <${data.email}> ${data.phone ?? ""}\n${data.subject ?? ""}\n\n${data.message ?? ""}`,
  );
  return { ok: "Thank you! Someone from our team will be in touch within two business days." };
}
