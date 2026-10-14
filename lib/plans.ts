import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { buildSchedule, type PlanOptions } from "@/lib/payments";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const DEFAULT_PLAN = {
  depositPercent: Number(process.env.DEFAULT_DEPOSIT_PERCENT ?? 25),
  installmentCount: Number(process.env.DEFAULT_INSTALLMENTS ?? 3),
  finalDueDaysBefore: Number(process.env.DEFAULT_FINAL_DUE_DAYS ?? 14),
};

/**
 * Creates (or rebuilds) an event's payment plan. Refuses to rebuild once any
 * installment has been paid, so recorded money is never discarded.
 */
export async function createOrReplacePlan(
  tx: Tx,
  args: { eventId: string; quoteId: string | null } & Omit<PlanOptions, "startDate">,
) {
  const existing = await tx.query.paymentPlans.findFirst({
    where: eq(schema.paymentPlans.eventId, args.eventId),
    with: { installments: true },
  });
  if (existing) {
    if (existing.installments.some((i) => i.status === "paid")) {
      throw new Error("This plan already has recorded payments. Adjust individual installments instead.");
    }
    await tx.delete(schema.paymentPlans).where(eq(schema.paymentPlans.id, existing.id));
  }
  const [plan] = await tx
    .insert(schema.paymentPlans)
    .values({ eventId: args.eventId, quoteId: args.quoteId, total: args.total })
    .returning();
  const schedule = buildSchedule(args);
  if (schedule.length) {
    await tx.insert(schema.installments).values(
      schedule.map((s, i) => ({ planId: plan.id, label: s.label, dueDate: s.dueDate, amount: s.amount, sortOrder: i })),
    );
  }
  return plan;
}

/** Marks the plan complete once every installment is paid or waived. */
export async function refreshPlanStatus(planId: string, conn: typeof db | Tx = db) {
  const rows = await conn.query.installments.findMany({ where: eq(schema.installments.planId, planId) });
  const done = rows.length > 0 && rows.every((r) => r.status !== "pending");
  await conn
    .update(schema.paymentPlans)
    .set({ status: done ? "completed" : "active" })
    .where(eq(schema.paymentPlans.id, planId));
}
