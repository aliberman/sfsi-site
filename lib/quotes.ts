// Pure quote math, shared by the client portal and back office.

export type LineLike = { quantity: number; unitPrice: number };
export type QuoteLike = { discount: number; subsidy: number; taxRateBps: number };

export function lineTotal(line: LineLike) {
  return line.quantity * line.unitPrice;
}

export function quoteTotals(quote: QuoteLike, lines: LineLike[]) {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const reductions = Math.min(subtotal, quote.discount + quote.subsidy);
  const taxable = subtotal - reductions;
  const tax = Math.round((taxable * quote.taxRateBps) / 10_000);
  return { subtotal, discount: quote.discount, subsidy: quote.subsidy, tax, total: taxable + tax };
}

/** Default quantity for a catalog item given the event's guest count. */
export function defaultQuantity(unit: string, guestCount: number | null | undefined, requested = 1) {
  if (unit === "per_guest") return Math.max(guestCount ?? requested, 1);
  return Math.max(requested, 1);
}
