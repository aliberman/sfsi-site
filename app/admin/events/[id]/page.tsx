import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { AlertTriangle, Mail, Phone, Trash2 } from "lucide-react";
import * as A from "@/app/actions/admin";
import MessageThread from "@/components/MessageThread";
import ResetForm from "@/components/ResetForm";
import QuoteView, { QuoteTotals } from "@/components/QuoteView";
import StatusStepper from "@/components/StatusStepper";
import { SubmitButton } from "@/components/SubmitButton";
import { EmptyState, Options, PageHeader, Pill, StatusBadge, Tabs } from "@/components/ui";
import { requireOperator } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { allocatedOnDate } from "@/lib/events";
import { loadEventDetail, paymentSummary, type EventDetail } from "@/lib/event-data";
import {
  CATEGORY_LABELS,
  centsToInput,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  formatDate,
  formatDateTime,
  MEAL_TYPE_LABELS,
  money,
  PAYMENT_METHOD_LABELS,
  SERVICE_STYLE_LABELS,
  STAFF_ROLE_LABELS,
  TASK_CATEGORY_LABELS,
  todayIso,
  UNIT_LABELS,
} from "@/lib/format";
import { lineTotal, quoteTotals } from "@/lib/quotes";

export const metadata = { title: "Event workspace" };

function Hidden({ eventId, ...rest }: { eventId: string } & Record<string, string>) {
  return (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      {Object.entries(rest).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
    </>
  );
}

export default async function AdminEventPage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string; quote?: string } }) {
  const user = await requireOperator();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const event = await loadEventDetail(params.id);
  if (!event) notFound();
  const tab = searchParams.tab ?? "overview";
  const base = `/admin/events/${event.id}`;
  const openTasks = event.tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="grid gap-6">
      <div className="text-sm"><Link href="/admin/events" className="link">← All events</Link></div>
      <PageHeader
        title={event.title}
        subtitle={`${EVENT_TYPE_LABELS[event.type]} · ${formatDate(event.eventDate, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · ${event.guestCount ?? "?"} guests · ${event.owner.name}`}
        actions={<StatusBadge status={event.status} />}
      />
      <div className="card py-4"><StatusStepper status={event.status} /></div>
      <Tabs
        base={base}
        current={tab}
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "requests", label: "Requests", count: event.serviceRequests.length + event.cateringRequests.length },
          { key: "quote", label: "Quotes", count: event.quotes.length },
          { key: "payments", label: "Payment plan" },
          { key: "provisioning", label: "Provisioning", count: openTasks },
          { key: "messages", label: "Messages", count: event.messages.length },
          { key: "activity", label: "Activity" },
        ]}
      />
      {tab === "overview" && <Overview event={event} />}
      {tab === "requests" && <Requests event={event} />}
      {tab === "quote" && <Quotes event={event} selected={searchParams.quote} />}
      {tab === "payments" && <Payments event={event} />}
      {tab === "provisioning" && <Provisioning event={event} />}
      {tab === "messages" && (
        <div className="card grid gap-5">
          <MessageThread messages={event.messages} viewerId={user.id} />
          <ResetForm action={A.postOperatorMessage} className="grid gap-3">
            <Hidden eventId={event.id} />
            <textarea name="body" rows={3} required className="input" placeholder="Write to the family, or leave an internal note…" />
            <div className="flex items-center gap-4">
              <SubmitButton className="btn-primary" pendingLabel="Sending…">Post</SubmitButton>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="internal" /> Internal note (team only)</label>
            </div>
          </ResetForm>
        </div>
      )}
      {tab === "activity" && (
        <div className="card">
          <ul className="grid gap-2 text-sm">
            {event.activity.map((a) => (
              <li key={a.id}><span className="text-gray-500">{formatDateTime(a.createdAt)}</span> · <span className="font-medium">{a.actor?.name ?? "System"}</span> — {a.action}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

async function Overview({ event }: { event: EventDetail }) {
  const [operators, venues] = await Promise.all([
    db.query.users.findMany({ where: inArray(schema.users.role, ["operator", "admin"]), orderBy: [asc(schema.users.name)] }),
    db.query.venues.findMany({ orderBy: [asc(schema.venues.name)] }),
  ]);
  const summary = paymentSummary(event.paymentPlan);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="grid content-start gap-6 lg:col-span-2">
        <form action={A.updateEventDetails} className="card grid gap-4">
          <h2 className="section-title">Logistics</h2>
          <Hidden eventId={event.id} />
          <div className="grid gap-4 sm:grid-cols-4">
            <label className="label">Date<input type="date" name="eventDate" defaultValue={event.eventDate ?? ""} className="input" /></label>
            <label className="label">Start<input type="time" name="startTime" defaultValue={event.startTime ?? ""} className="input" /></label>
            <label className="label">End<input type="time" name="endTime" defaultValue={event.endTime ?? ""} className="input" /></label>
            <label className="label">Guests<input type="number" name="guestCount" defaultValue={event.guestCount ?? ""} className="input" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">Venue
              <select name="venueId" defaultValue={event.venueId ?? ""} className="input">
                <option value="">Client venue / TBD</option>
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.capacity ? ` (${v.capacity})` : ""}</option>)}
              </select>
            </label>
            <label className="label">Venue notes<input name="venueNotes" defaultValue={event.venueNotes ?? ""} className="input" /></label>
          </div>
          {event.venue?.capacity && event.guestCount && event.guestCount > event.venue.capacity && (
            <p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="h-4 w-4" />Guest count exceeds venue capacity ({event.venue.capacity}).</p>
          )}
          <SubmitButton className="btn-primary w-fit">Save logistics</SubmitButton>
        </form>
        <div className="card text-sm">
          <h2 className="section-title mb-3">From the family</h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div><dt className="text-gray-500">Package</dt><dd>{event.package?.name ?? "À la carte"}</dd></div>
            <div><dt className="text-gray-500">Budget</dt><dd>{money(event.budget)}</dd></div>
            <div><dt className="text-gray-500">Submitted</dt><dd>{event.submittedAt ? formatDateTime(event.submittedAt) : "Not yet"}</dd></div>
          </dl>
          {event.notes && <p className="mt-3 whitespace-pre-line rounded-lg bg-gray-50 p-3">{event.notes}</p>}
        </div>
      </div>
      <div className="grid content-start gap-6">
        <div className="card grid gap-2 text-sm">
          <h2 className="section-title">Client</h2>
          <div className="font-medium">{event.owner.name}</div>
          <a href={`mailto:${event.owner.email}`} className="link flex items-center gap-2"><Mail className="h-4 w-4" />{event.owner.email}</a>
          {event.owner.phone && <a href={`tel:${event.owner.phone}`} className="link flex items-center gap-2"><Phone className="h-4 w-4" />{event.owner.phone}</a>}
        </div>
        <form action={A.setEventStatus} className="card grid gap-3">
          <h2 className="section-title">Status</h2>
          <Hidden eventId={event.id} />
          <select name="status" defaultValue={event.status} className="input"><Options map={EVENT_STATUS_LABELS} /></select>
          <SubmitButton className="btn-ghost w-fit">Update status</SubmitButton>
          <p className="text-xs text-gray-500">Quotes and acceptance move status automatically; use this for production, completion, or cancellation. The family is emailed.</p>
        </form>
        <form action={A.assignCoordinator} className="card grid gap-3">
          <h2 className="section-title">Coordinator</h2>
          <Hidden eventId={event.id} />
          <select name="coordinatorId" defaultValue={event.coordinatorId ?? ""} className="input">
            <option value="">Unassigned</option>
            {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <SubmitButton className="btn-ghost w-fit">Assign</SubmitButton>
        </form>
        {summary && (
          <div className="card grid gap-1 text-sm">
            <h2 className="section-title mb-2">Payments</h2>
            <div className="flex justify-between"><span>Paid</span><span>{money(summary.paid)}</span></div>
            <div className="flex justify-between"><span>Balance</span><span className="font-medium">{money(summary.balance)}</span></div>
            {summary.overdue.length > 0 && <Pill tone="red">{summary.overdue.length} overdue</Pill>}
          </div>
        )}
      </div>
    </div>
  );
}

function Requests({ event }: { event: EventDetail }) {
  return (
    <div className="grid gap-6">
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Services & equipment</h2>
          <form action={A.createQuote}><Hidden eventId={event.id} /><SubmitButton className="btn-primary btn-sm">Build quote from requests</SubmitButton></form>
        </div>
        {event.serviceRequests.length === 0 ? <EmptyState>No requests.</EmptyState> : (
          <table className="table">
            <thead><tr><th>Item</th><th>Catalog price</th><th className="text-right">Qty</th><th>Status</th><th /></tr></thead>
            <tbody>
              {event.serviceRequests.map((r) => (
                <tr key={r.id}>
                  <td><div className="font-medium">{r.description}</div>{r.notes && <div className="text-xs text-gray-600">{r.notes}</div>}{!r.catalogItem && <Pill tone="amber">custom</Pill>}</td>
                  <td>{r.catalogItem ? `${money(r.catalogItem.unitPrice)} ${UNIT_LABELS[r.catalogItem.unit]}` : "—"}</td>
                  <td className="text-right">{r.quantity}</td>
                  <td><Pill tone={r.status === "approved" ? "green" : r.status === "declined" ? "red" : "gray"}>{r.status}</Pill></td>
                  <td className="whitespace-nowrap text-right">
                    {(["approved", "declined"] as const).map((s) => (
                      <form key={s} action={A.setRequestStatus} className="inline">
                        <Hidden eventId={event.id} requestId={r.id} status={s} />
                        <button className="btn-ghost btn-sm ml-1">{s === "approved" ? "Approve" : "Decline"}</button>
                      </form>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card">
        <h2 className="section-title mb-4">Catering</h2>
        {event.cateringRequests.length === 0 ? <EmptyState>No catering requests.</EmptyState> : (
          <div className="grid gap-3 md:grid-cols-2">
            {event.cateringRequests.map((c) => (
              <div key={c.id} className="rounded-xl border p-4 text-sm">
                <div className="flex justify-between"><span className="font-medium">{MEAL_TYPE_LABELS[c.mealType]} · {SERVICE_STYLE_LABELS[c.serviceStyle]}</span><Pill>{c.status}</Pill></div>
                <dl className="mt-2 grid gap-1 text-gray-700">
                  <div>{c.guestCount} guests{c.budgetPerGuest != null && ` · target ${money(c.budgetPerGuest)}/guest`}</div>
                  {c.hechsher && <div>Hechsher: {c.hechsher}</div>}
                  {c.menuNotes && <div>Menu: {c.menuNotes}</div>}
                  {c.dietaryNotes && <div>Dietary: {c.dietaryNotes}</div>}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function Quotes({ event, selected }: { event: EventDetail; selected?: string }) {
  const quote = event.quotes.find((q) => q.id === selected) ?? event.quotes.find((q) => q.status === "draft") ?? event.quotes[0];
  const catalog = await db.query.catalogItems.findMany({ where: eq(schema.catalogItems.active, true), orderBy: [asc(schema.catalogItems.category), asc(schema.catalogItems.name)] });
  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <aside className="grid content-start gap-2">
        <form action={A.createQuote}><Hidden eventId={event.id} /><SubmitButton className="btn-primary w-full">New quote from requests</SubmitButton></form>
        {event.quotes.map((q) => (
          <Link key={q.id} href={`/admin/events/${event.id}?tab=quote&quote=${q.id}`} className={`rounded-xl border bg-white p-3 text-sm ${q.id === quote?.id ? "border-brand-400 ring-2 ring-brand-100" : ""}`}>
            <div className="flex justify-between"><span className="font-medium">#{q.number}</span><Pill tone={q.status === "accepted" ? "green" : q.status === "sent" ? "blue" : q.status === "draft" ? "amber" : "gray"}>{q.status}</Pill></div>
            <div className="mt-1 text-gray-600">{money(quoteTotals(q, q.lines).total)}</div>
          </Link>
        ))}
      </aside>
      <div className="lg:col-span-3">
        {!quote ? <EmptyState>No quotes yet. Build one from the family’s requests.</EmptyState> : quote.status === "draft" ? (
          <DraftQuote event={event} quote={quote} catalog={catalog} />
        ) : (
          <div className="card grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">Quote #{quote.number} <span className="text-sm font-normal text-gray-500">{quote.sentAt && `sent ${formatDateTime(quote.sentAt)}`}</span></h2>
              <div className="flex gap-2">
                {quote.status === "sent" && (
                  <form action={A.markQuoteAccepted}><Hidden eventId={event.id} quoteId={quote.id} /><SubmitButton className="btn-ghost btn-sm" confirm="Mark accepted on the client's behalf? This books the event and creates the payment plan.">Mark accepted</SubmitButton></form>
                )}
                <form action={A.duplicateQuote}><Hidden eventId={event.id} quoteId={quote.id} /><SubmitButton className="btn-ghost btn-sm">Revise as new draft</SubmitButton></form>
              </div>
            </div>
            <QuoteView quote={quote} lines={quote.lines} />
          </div>
        )}
      </div>
    </div>
  );
}

function DraftQuote({ event, quote, catalog }: { event: EventDetail; quote: EventDetail["quotes"][number]; catalog: (typeof schema.catalogItems.$inferSelect)[] }) {
  const lines = [...quote.lines].sort((a, b) => a.sortOrder - b.sortOrder);
  const totals = quoteTotals(quote, lines);
  return (
    <div className="grid gap-6">
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Draft quote #{quote.number}</h2>
          <div className="flex gap-2">
            <form action={A.deleteDraftQuote}><Hidden eventId={event.id} quoteId={quote.id} /><SubmitButton className="btn-danger btn-sm" confirm="Delete this draft?">Delete draft</SubmitButton></form>
            <form action={A.sendQuote}><Hidden eventId={event.id} quoteId={quote.id} /><SubmitButton className="btn-primary btn-sm" pendingLabel="Sending…" confirm="Send this quote to the family?">Send to family</SubmitButton></form>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Description</th><th className="w-20">Qty</th><th className="w-28">Unit $</th><th className="text-right">Total</th><th /></tr></thead>
            <tbody>
              {lines.map((l) => {
                const formId = `line-${l.id}`;
                return (
                  <tr key={l.id}>
                    <td>
                      <input form={formId} name="description" defaultValue={l.description} className="input" />
                      <div className="mt-1 text-xs text-gray-500">{CATEGORY_LABELS[l.category]}</div>
                    </td>
                    <td><input form={formId} name="quantity" type="number" min={0} defaultValue={l.quantity} className="input" /></td>
                    <td><input form={formId} name="unitPrice" inputMode="decimal" defaultValue={centsToInput(l.unitPrice)} className="input" /></td>
                    <td className="text-right font-medium">{money(lineTotal(l))}</td>
                    <td className="whitespace-nowrap">
                      <form id={formId} action={A.updateQuoteLine} className="inline"><Hidden eventId={event.id} quoteId={quote.id} lineId={l.id} /><button className="btn-ghost btn-sm">Save</button></form>
                      <form action={A.removeQuoteLine} className="ml-1 inline"><Hidden eventId={event.id} quoteId={quote.id} lineId={l.id} /><button className="p-1 text-gray-400 hover:text-rose-600" aria-label="Remove line"><Trash2 className="h-4 w-4" /></button></form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lines.some((l) => l.unitPrice === 0) && <p className="mt-2 flex items-center gap-2 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Some lines have no price yet.</p>}
        <div className="mt-4"><QuoteTotals totals={totals} taxRateBps={quote.taxRateBps} /></div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ResetForm action={A.addQuoteLine} className="card grid gap-3">
          <h3 className="font-semibold">Add line</h3>
          <Hidden eventId={event.id} quoteId={quote.id} />
          <label className="label">From catalog
            <select name="catalogItemId" className="input" defaultValue="">
              <option value="">— Custom line —</option>
              {catalog.map((c) => <option key={c.id} value={c.id}>{CATEGORY_LABELS[c.category]}: {c.name} ({money(c.unitPrice)} {UNIT_LABELS[c.unit]})</option>)}
            </select>
          </label>
          <label className="label">Description <span className="hint">required for custom lines</span><input name="description" className="input" /></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="label">Qty<input name="quantity" type="number" min={0} className="input" placeholder="auto" /></label>
            <label className="label">Unit $<input name="unitPrice" inputMode="decimal" className="input" placeholder="catalog" /></label>
            <label className="label">Category<select name="category" className="input"><Options map={CATEGORY_LABELS} /></select></label>
          </div>
          <SubmitButton className="btn-ghost w-fit">Add line</SubmitButton>
        </ResetForm>
        <form action={A.updateQuoteTerms} className="card grid gap-3">
          <h3 className="font-semibold">Terms</h3>
          <Hidden eventId={event.id} quoteId={quote.id} />
          <div className="grid grid-cols-3 gap-2">
            <label className="label">Discount $<input name="discount" inputMode="decimal" defaultValue={centsToInput(quote.discount)} className="input" /></label>
            <label className="label">Subsidy $<input name="subsidy" inputMode="decimal" defaultValue={centsToInput(quote.subsidy)} className="input" /></label>
            <label className="label">Tax %<input name="taxPercent" inputMode="decimal" defaultValue={(quote.taxRateBps / 100).toString()} className="input" /></label>
          </div>
          <label className="label">Valid until<input name="validUntil" type="date" defaultValue={quote.validUntil ?? ""} className="input" /></label>
          <label className="label">Notes to family<textarea name="notes" rows={3} defaultValue={quote.notes ?? ""} className="input" /></label>
          <SubmitButton className="btn-ghost w-fit">Save terms</SubmitButton>
        </form>
      </div>
    </div>
  );
}

function Payments({ event }: { event: EventDetail }) {
  const plan = event.paymentPlan;
  const accepted = event.quotes.find((q) => q.status === "accepted");
  const summary = paymentSummary(plan);
  const today = todayIso();
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        <h2 className="section-title mb-4">Installments</h2>
        {!plan ? <EmptyState>No payment plan yet. It’s created automatically when the family accepts a quote, or build one here.</EmptyState> : (
          <div className="grid gap-4">
            {plan.installments.map((i) => (
              <div key={i.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{i.label}</span>
                    <span className="ml-2 text-sm text-gray-500">due {formatDate(i.dueDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{money(i.amount)}</span>
                    {i.status === "paid" ? <Pill tone="green">Paid {formatDate(i.paidAt)}</Pill> : i.status === "waived" ? <Pill>Waived</Pill> : i.dueDate < today ? <Pill tone="red">Overdue</Pill> : <Pill tone="amber">Pending</Pill>}
                  </div>
                </div>
                {i.status === "paid" && <p className="mt-1 text-xs text-gray-500">{i.method && PAYMENT_METHOD_LABELS[i.method]}{i.reference && ` · ref ${i.reference}`}</p>}
                {i.status === "pending" ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <form action={A.recordPayment} className="flex flex-wrap items-end gap-2">
                      <Hidden eventId={event.id} installmentId={i.id} />
                      <select name="method" className="input w-auto"><Options map={PAYMENT_METHOD_LABELS} /></select>
                      <input name="reference" placeholder="Check # / ref" className="input w-32" />
                      <SubmitButton className="btn-primary btn-sm">Record payment</SubmitButton>
                    </form>
                    <form action={A.updateInstallment} className="flex flex-wrap items-end gap-2">
                      <Hidden eventId={event.id} installmentId={i.id} />
                      <input name="amount" inputMode="decimal" defaultValue={centsToInput(i.amount)} className="input w-28" aria-label="Amount" />
                      <input name="dueDate" type="date" defaultValue={i.dueDate} className="input w-40" aria-label="Due date" />
                      <SubmitButton className="btn-ghost btn-sm">Adjust</SubmitButton>
                    </form>
                    <form action={A.setInstallmentStatus}>
                      <Hidden eventId={event.id} installmentId={i.id} status="waived" />
                      <SubmitButton className="text-xs text-gray-500 hover:underline" confirm="Waive this installment?">Waive</SubmitButton>
                    </form>
                  </div>
                ) : (
                  <form action={A.setInstallmentStatus} className="mt-2">
                    <Hidden eventId={event.id} installmentId={i.id} status="pending" />
                    <SubmitButton className="text-xs text-gray-500 hover:underline" confirm="Reopen this installment as unpaid?">Reopen</SubmitButton>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid content-start gap-6">
        {summary && plan && (
          <div className="card grid gap-1 text-sm">
            <div className="flex justify-between"><span>Plan total</span><span>{money(plan.total)}</span></div>
            <div className="flex justify-between"><span>Paid</span><span className="text-brand-700">{money(summary.paid)}</span></div>
            {summary.waived > 0 && <div className="flex justify-between"><span>Waived</span><span>{money(summary.waived)}</span></div>}
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Balance</span><span>{money(summary.balance)}</span></div>
            {plan.installments.reduce((s, i) => s + i.amount, 0) !== plan.total && (
              <p className="mt-2 text-xs text-amber-700">Installments sum to {money(plan.installments.reduce((s, i) => s + i.amount, 0))}, not the plan total.</p>
            )}
          </div>
        )}
        <form action={A.buildPaymentPlan} className="card grid gap-3">
          <h2 className="section-title">{plan ? "Rebuild plan" : "Build plan"}</h2>
          <Hidden eventId={event.id} />
          <label className="label">Total $ <span className="hint">{accepted ? `defaults to accepted quote ${money(quoteTotals(accepted, accepted.lines).total)}` : "required without an accepted quote"}</span>
            <input name="total" inputMode="decimal" className="input" placeholder={accepted ? centsToInput(quoteTotals(accepted, accepted.lines).total) : ""} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="label">Deposit %<input name="depositPercent" type="number" min={0} max={100} defaultValue={25} className="input" /></label>
            <label className="label">Installments<input name="installmentCount" type="number" min={0} max={24} defaultValue={3} className="input" /></label>
            <label className="label">Paid off<input name="finalDueDaysBefore" type="number" min={0} defaultValue={14} className="input" title="days before event" /></label>
          </div>
          <p className="text-xs text-gray-500">“Paid off” = days before the event the final payment is due. Rebuilding is blocked once a payment is recorded.</p>
          <SubmitButton className="btn-ghost w-fit" confirm={plan ? "Replace the current schedule?" : undefined}>{plan ? "Rebuild schedule" : "Create schedule"}</SubmitButton>
        </form>
      </div>
    </div>
  );
}

async function Provisioning({ event }: { event: EventDetail }) {
  const [staff, equipment, operators, allocatedElsewhere] = await Promise.all([
    db.query.staffMembers.findMany({ where: eq(schema.staffMembers.active, true), orderBy: [asc(schema.staffMembers.name)] }),
    db.query.catalogItems.findMany({ where: eq(schema.catalogItems.category, "equipment"), orderBy: [asc(schema.catalogItems.name)] }),
    db.query.users.findMany({ where: inArray(schema.users.role, ["operator", "admin"]), orderBy: [asc(schema.users.name)] }),
    event.eventDate ? allocatedOnDate(event.eventDate, event.id) : Promise.resolve(new Map<string, number>()),
  ]);
  const accepted = event.quotes.find((q) => q.status === "accepted");
  const staffingNeeds = accepted?.lines.filter((l) => l.category === "staffing") ?? [];
  const today = todayIso();
  const tasksByCategory = Object.keys(TASK_CATEGORY_LABELS)
    .map((c) => ({ category: c, tasks: event.tasks.filter((t) => t.category === c) }))
    .filter((g) => g.tasks.length);
  const doneCount = event.tasks.filter((t) => t.status === "done").length;

  // Staff double-booking: same person on another active event that day.
  const busy = new Set<string>();
  if (event.eventDate) {
    const rows = await db
      .select({ staffMemberId: schema.staffAssignments.staffMemberId })
      .from(schema.staffAssignments)
      .innerJoin(schema.events, eq(schema.events.id, schema.staffAssignments.eventId))
      .where(and(eq(schema.events.eventDate, event.eventDate), inArray(schema.events.status, ["submitted", "quoted", "booked", "in_production"])));
    for (const r of rows) busy.add(r.staffMemberId);
    for (const a of event.staffAssignments) busy.delete(a.staffMemberId);
  }

  return (
    <div className="grid gap-6">
      {event.status !== "booked" && event.status !== "in_production" && event.status !== "completed" && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Provisioning normally starts once the event is booked. You can still prepare assignments here.</p>
      )}

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Checklist <span className="text-sm font-normal text-gray-500">{doneCount}/{event.tasks.length} done</span></h2>
          {event.tasks.length === 0 && accepted && (
            <form action={A.reprovision}><Hidden eventId={event.id} /><SubmitButton className="btn-ghost btn-sm">Generate from accepted quote</SubmitButton></form>
          )}
        </div>
        {event.tasks.length === 0 ? <EmptyState>No tasks yet.</EmptyState> : (
          <div className="grid gap-5 md:grid-cols-2">
            {tasksByCategory.map((g) => (
              <div key={g.category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{TASK_CATEGORY_LABELS[g.category]}</h3>
                <ul className="grid gap-1.5">
                  {g.tasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <form action={A.setTaskStatus}>
                        <Hidden eventId={event.id} taskId={t.id} status={t.status === "done" ? "todo" : "done"} />
                        <button className={`mt-0.5 h-4 w-4 rounded border ${t.status === "done" ? "border-brand-600 bg-brand-600" : "border-gray-400"}`} aria-label={t.status === "done" ? "Mark not done" : "Mark done"} />
                      </form>
                      <span className={`flex-1 ${t.status === "done" ? "text-gray-400 line-through" : ""}`}>
                        {t.title}
                        <span className="block text-xs text-gray-500">
                          {t.dueDate && <span className={t.status !== "done" && t.dueDate < today ? "text-rose-600" : ""}>due {formatDate(t.dueDate, { month: "short", day: "numeric" })}</span>}
                          {t.assignee && ` · ${t.assignee.name}`}
                        </span>
                      </span>
                      <form action={A.removeTask}><Hidden eventId={event.id} taskId={t.id} /><button className="text-gray-300 hover:text-rose-600" aria-label="Delete task"><Trash2 className="h-3.5 w-3.5" /></button></form>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <ResetForm action={A.addTask} className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-5">
          <Hidden eventId={event.id} />
          <input name="title" required placeholder="New task" className="input sm:col-span-2" />
          <select name="category" className="input"><Options map={TASK_CATEGORY_LABELS} /></select>
          <input name="dueDate" type="date" className="input" />
          <div className="flex gap-2">
            <select name="assigneeId" className="input"><option value="">Anyone</option>{operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            <SubmitButton className="btn-ghost">Add</SubmitButton>
          </div>
        </ResetForm>
      </section>

      <section className="card">
        <h2 className="section-title mb-1">Staffing</h2>
        {staffingNeeds.length > 0 && (
          <p className="mb-3 text-sm text-gray-600">Quoted: {staffingNeeds.map((l) => `${l.description} (${l.quantity})`).join(" · ")}</p>
        )}
        {event.staffAssignments.length === 0 ? <EmptyState>No staff assigned.</EmptyState> : (
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Call</th><th>Contact</th><th>Status</th><th /></tr></thead>
            <tbody>
              {event.staffAssignments.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.staffMember.name}{a.notes && <div className="text-xs font-normal text-gray-500">{a.notes}</div>}</td>
                  <td>{STAFF_ROLE_LABELS[a.role]}</td>
                  <td className="whitespace-nowrap">{a.callTime ?? "—"}{a.endTime && `–${a.endTime}`}</td>
                  <td className="text-xs">{a.staffMember.phone ?? a.staffMember.email ?? "—"}</td>
                  <td>
                    <form action={A.setAssignmentStatus} className="flex gap-1">
                      <Hidden eventId={event.id} assignmentId={a.id} />
                      <select name="status" defaultValue={a.status} className="input py-1 text-xs">
                        <option value="tentative">Tentative</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option>
                      </select>
                      <button className="btn-ghost btn-sm">Set</button>
                    </form>
                  </td>
                  <td><form action={A.removeStaffAssignment}><Hidden eventId={event.id} assignmentId={a.id} /><button className="text-gray-400 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ResetForm action={A.addStaffAssignment} className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-6">
          <Hidden eventId={event.id} />
          <select name="staffMemberId" required className="input sm:col-span-2">
            <option value="">Choose staff…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name} — {STAFF_ROLE_LABELS[s.primaryRole]}{busy.has(s.id) ? " (booked that day)" : ""}</option>)}
          </select>
          <select name="role" className="input" defaultValue=""><option value="">Primary role</option><Options map={STAFF_ROLE_LABELS} /></select>
          <input name="callTime" placeholder="Call e.g. 4:30pm" className="input" />
          <input name="endTime" placeholder="Out e.g. 11pm" className="input" />
          <SubmitButton className="btn-ghost">Assign</SubmitButton>
        </ResetForm>
        {staff.length === 0 && <p className="mt-2 text-xs text-gray-500">Add people in <Link href="/admin/staff" className="link">Staff</Link> first.</p>}
      </section>

      <section className="card">
        <h2 className="section-title mb-4">Equipment</h2>
        {event.equipmentAllocations.length === 0 ? <EmptyState>No equipment allocated.</EmptyState> : (
          <table className="table">
            <thead><tr><th>Item</th><th className="text-right">Qty</th><th>Availability on {formatDate(event.eventDate)}</th><th /></tr></thead>
            <tbody>
              {event.equipmentAllocations.map((a) => {
                const stock = a.catalogItem.inventoryQty;
                const elsewhere = allocatedElsewhere.get(a.catalogItemId) ?? 0;
                const short = stock != null && elsewhere + a.quantity > stock;
                return (
                  <tr key={a.id}>
                    <td className="font-medium">{a.catalogItem.name}{a.notes && <div className="text-xs font-normal text-gray-500">{a.notes}</div>}</td>
                    <td className="text-right">{a.quantity}</td>
                    <td>
                      {stock == null ? <span className="text-gray-500">Not tracked</span> : short ? (
                        <Pill tone="red">Short {elsewhere + a.quantity - stock} — {elsewhere} out at other events, {stock} owned</Pill>
                      ) : (
                        <Pill tone="green">OK — {stock - elsewhere - a.quantity} spare</Pill>
                      )}
                    </td>
                    <td><form action={A.removeAllocation}><Hidden eventId={event.id} allocationId={a.id} /><button className="text-gray-400 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button></form></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <ResetForm action={A.addAllocation} className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-5">
          <Hidden eventId={event.id} />
          <select name="catalogItemId" required className="input sm:col-span-2">
            {equipment.map((e) => <option key={e.id} value={e.id}>{e.name}{e.inventoryQty != null ? ` (${e.inventoryQty - (allocatedElsewhere.get(e.id) ?? 0)} free)` : ""}</option>)}
          </select>
          <input name="quantity" type="number" min={1} defaultValue={1} className="input" />
          <input name="notes" placeholder="Notes" className="input" />
          <SubmitButton className="btn-ghost">Allocate</SubmitButton>
        </ResetForm>
      </section>

      <section className="card">
        <h2 className="section-title mb-4">Run of show</h2>
        {event.scheduleItems.length === 0 ? <EmptyState>No schedule yet.</EmptyState> : (
          <ul className="grid gap-2 text-sm">
            {event.scheduleItems.map((s) => (
              <li key={s.id} className="flex items-start gap-3">
                <span className="w-36 flex-none font-medium">{s.time}</span>
                <span className="flex-1">{s.title}{s.details && <span className="block text-gray-500">{s.details}</span>}</span>
                {!s.clientVisible && <Pill>team only</Pill>}
                <form action={A.removeScheduleItem}><Hidden eventId={event.id} itemId={s.id} /><button className="text-gray-400 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button></form>
              </li>
            ))}
          </ul>
        )}
        <ResetForm action={A.addScheduleItem} className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-6">
          <Hidden eventId={event.id} />
          <input name="time" required placeholder="6:00pm" className="input" />
          <input name="title" required placeholder="Chuppah" className="input sm:col-span-2" />
          <input name="details" placeholder="Details" className="input" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clientVisible" defaultChecked /> Family sees it</label>
          <SubmitButton className="btn-ghost">Add</SubmitButton>
        </ResetForm>
      </section>
    </div>
  );
}
