import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/events";
import { money } from "@/lib/format";
import { operatorInbox, sendEmail } from "@/lib/notify";
import { refreshPlanStatus } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

// Marks an installment paid when Stripe Checkout completes.
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
    const session = event.data.object;
    const installmentId = session.metadata?.installmentId;
    if (installmentId) {
      const installment = await db.query.installments.findFirst({
        where: and(eq(schema.installments.id, installmentId), eq(schema.installments.stripeSessionId, session.id)),
        with: { plan: true },
      });
      if (installment && installment.status === "pending") {
        await db
          .update(schema.installments)
          .set({ status: "paid", paidAt: new Date(), method: "card", reference: String(session.payment_intent ?? session.id) })
          .where(eq(schema.installments.id, installment.id));
        await refreshPlanStatus(installment.planId);
        await logActivity(installment.plan.eventId, null, `Online payment ${money(installment.amount)} for ${installment.label}`);
        await sendEmail(operatorInbox(), "Online payment received", `${money(installment.amount)} paid for ${installment.label}.`);
      }
    }
  }
  return NextResponse.json({ received: true });
}
