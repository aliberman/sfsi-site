import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSchedule } from "./payments";
import { quoteTotals } from "./quotes";

test("schedule sums to total and ends before the event", () => {
  const s = buildSchedule({ total: 1_000_001, depositPercent: 25, installmentCount: 3, eventDate: "2027-06-01", finalDueDaysBefore: 14, startDate: "2026-10-14" });
  assert.equal(s.length, 4);
  assert.equal(s[0].label, "Deposit");
  assert.equal(s[0].amount, 250_000);
  assert.equal(s.reduce((a, b) => a + b.amount, 0), 1_000_001);
  assert.equal(s.at(-1)!.dueDate, "2027-05-18");
  for (let i = 1; i < s.length; i++) assert.ok(s[i].dueDate > s[i - 1].dueDate);
});

test("zero installments means pay in full", () => {
  const s = buildSchedule({ total: 5000, depositPercent: 25, installmentCount: 0, eventDate: null, finalDueDaysBefore: 14, startDate: "2026-10-14" });
  assert.deepEqual(s, [{ label: "Deposit", dueDate: "2026-10-14", amount: 5000 }]);
});

test("event sooner than the payoff window compresses the schedule", () => {
  const s = buildSchedule({ total: 9000, depositPercent: 0, installmentCount: 3, eventDate: "2026-10-20", finalDueDaysBefore: 14, startDate: "2026-10-14" });
  assert.equal(s.length, 3);
  assert.equal(s.reduce((a, b) => a + b.amount, 0), 9000);
  assert.ok(s.every((i) => i.dueDate > "2026-10-14"));
});

test("quote totals apply discount and subsidy before tax", () => {
  const t = quoteTotals({ discount: 10_000, subsidy: 20_000, taxRateBps: 700 }, [
    { quantity: 150, unitPrice: 6_500 },
    { quantity: 1, unitPrice: 180_000 },
  ]);
  assert.equal(t.subtotal, 1_155_000);
  assert.equal(t.tax, Math.round(1_125_000 * 0.07));
  assert.equal(t.total, 1_125_000 + t.tax);
});

test("reductions never push a quote negative", () => {
  const t = quoteTotals({ discount: 500, subsidy: 500, taxRateBps: 700 }, [{ quantity: 1, unitPrice: 600 }]);
  assert.equal(t.total, 0);
});
