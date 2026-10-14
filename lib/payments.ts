import { addDays, isoDate, todayIso } from "@/lib/format";

export type PlanOptions = {
  total: number; // cents
  depositPercent: number; // 0-100
  installmentCount: number; // number of payments after the deposit
  eventDate: string | null; // YYYY-MM-DD
  finalDueDaysBefore: number; // final installment due this many days before the event
  startDate?: string; // deposit due date (defaults to today)
};

export type PlannedInstallment = { label: string; dueDate: string; amount: number };

/**
 * Builds a deposit + evenly spaced installment schedule that is fully paid
 * `finalDueDaysBefore` days ahead of the event. Amounts always sum to `total`.
 */
export function buildSchedule(opts: PlanOptions): PlannedInstallment[] {
  const start = opts.startDate ?? todayIso();
  const count = Math.max(0, Math.floor(opts.installmentCount));
  const deposit = Math.round((opts.total * Math.min(Math.max(opts.depositPercent, 0), 100)) / 100);
  const remaining = opts.total - deposit;

  const schedule: PlannedInstallment[] = [];
  if (deposit > 0 || count === 0) {
    schedule.push({ label: "Deposit", dueDate: start, amount: count === 0 ? opts.total : deposit });
  }
  if (count === 0 || remaining <= 0) return schedule;

  let finalDue = opts.eventDate ? addDays(opts.eventDate, -Math.abs(opts.finalDueDaysBefore)) : addDays(start, 30 * count);
  if (finalDue <= start) finalDue = addDays(start, count); // event is very close: compress the schedule

  const startMs = new Date(`${start}T12:00:00`).getTime();
  const spanMs = new Date(`${finalDue}T12:00:00`).getTime() - startMs;
  const base = Math.floor(remaining / count);
  for (let i = 1; i <= count; i++) {
    const due = isoDate(new Date(startMs + (spanMs * i) / count));
    const amount = i === count ? remaining - base * (count - 1) : base;
    schedule.push({ label: i === count ? "Final payment" : `Installment ${i}`, dueDate: due, amount });
  }
  return schedule;
}
