import { CATEGORY_LABELS, formatDate, money } from "@/lib/format";
import { lineTotal, quoteTotals } from "@/lib/quotes";
import type { Quote, QuoteLine } from "@/lib/db/schema";

export default function QuoteView({ quote, lines }: { quote: Quote; lines: QuoteLine[] }) {
  const totals = quoteTotals(quote, lines);
  const sorted = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>Item</th><th>Category</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody>
            {sorted.map((l) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td className="text-gray-500">{CATEGORY_LABELS[l.category]}</td>
                <td className="text-right">{l.quantity}</td>
                <td className="text-right">{money(l.unitPrice)}</td>
                <td className="text-right font-medium">{money(lineTotal(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <QuoteTotals totals={totals} taxRateBps={quote.taxRateBps} />
      {quote.notes && <p className="whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{quote.notes}</p>}
      {quote.validUntil && <p className="text-xs text-gray-500">Valid until {formatDate(quote.validUntil)}</p>}
    </div>
  );
}

export function QuoteTotals({ totals, taxRateBps }: { totals: ReturnType<typeof quoteTotals>; taxRateBps: number }) {
  return (
    <dl className="ml-auto grid w-full max-w-xs gap-1 text-sm">
      <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
      {totals.discount > 0 && <div className="flex justify-between"><dt className="text-gray-600">Discount</dt><dd>−{money(totals.discount)}</dd></div>}
      {totals.subsidy > 0 && <div className="flex justify-between text-brand-700"><dt>SFSI community subsidy</dt><dd>−{money(totals.subsidy)}</dd></div>}
      {taxRateBps > 0 && <div className="flex justify-between"><dt className="text-gray-600">Tax ({(taxRateBps / 100).toFixed(2)}%)</dt><dd>{money(totals.tax)}</dd></div>}
      <div className="mt-1 flex justify-between border-t pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
    </dl>
  );
}
