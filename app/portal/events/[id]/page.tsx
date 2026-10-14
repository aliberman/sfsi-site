import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { CalendarDays, MapPin, Package, Trash2, UserRound, Users } from "lucide-react";
import {
  addCateringRequest,
  addServiceRequest,
  cancelEvent,
  payInstallment,
  postClientMessage,
  removeCateringRequest,
  removeServiceRequest,
  respondToQuote,
  submitEvent,
  updateEvent,
} from "@/app/actions/portal";
import EventForm from "@/components/EventForm";
import MessageThread from "@/components/MessageThread";
import ResetForm from "@/components/ResetForm";
import QuoteView from "@/components/QuoteView";
import StatusStepper from "@/components/StatusStepper";
import { SubmitButton } from "@/components/SubmitButton";
import { EmptyState, Options, PageHeader, Pill, StatusBadge, Tabs } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { clientCanEdit } from "@/lib/events";
import { loadEventDetail, paymentSummary } from "@/lib/event-data";
import {
  CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  formatDate,
  formatDateTime,
  formatTime,
  MEAL_TYPE_LABELS,
  money,
  PAYMENT_METHOD_LABELS,
  SERVICE_STYLE_LABELS,
  todayIso,
  UNIT_LABELS,
} from "@/lib/format";
import { activePackages, activeVenues } from "@/lib/public-data";
import { quoteTotals } from "@/lib/quotes";
import { getStripe } from "@/lib/stripe";

export const metadata = { title: "Event" };

export default async function PortalEventPage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string; paid?: string } }) {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const event = await loadEventDetail(params.id);
  if (!event || event.owner.id !== user.id) notFound();

  const tab = searchParams.tab ?? "overview";
  const editable = clientCanEdit(event.status);
  const visibleQuotes = event.quotes.filter((q) => q.status !== "draft");
  const openQuote = visibleQuotes.find((q) => q.status === "sent");
  const visibleMessages = event.messages.filter((m) => !m.internal);
  const base = `/portal/events/${event.id}`;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={event.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{EVENT_TYPE_LABELS[event.type]}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(event.eventDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            {event.guestCount ? <span className="flex items-center gap-1"><Users className="h-4 w-4" />{event.guestCount} guests</span> : null}
          </span>
        }
        actions={<StatusBadge status={event.status} />}
      />
      <div className="card py-4"><StatusStepper status={event.status} /></div>

      {openQuote && tab !== "quote" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm">
          <span>Your quote is ready: <strong>{money(quoteTotals(openQuote, openQuote.lines).total)}</strong></span>
          <Link href={`${base}?tab=quote`} className="btn-primary btn-sm">Review quote</Link>
        </div>
      )}

      <Tabs
        base={base}
        current={tab}
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "services", label: "Services & equipment", count: event.serviceRequests.length },
          { key: "catering", label: "Catering", count: event.cateringRequests.length },
          { key: "quote", label: "Quote", count: visibleQuotes.length },
          { key: "payments", label: "Payments" },
          { key: "messages", label: "Messages", count: visibleMessages.length },
        ]}
      />

      {tab === "overview" && <Overview event={event} editable={editable} />}
      {tab === "services" && <Services event={event} editable={editable} />}
      {tab === "catering" && <Catering event={event} editable={editable} />}
      {tab === "quote" && <Quotes event={event} quotes={visibleQuotes} />}
      {tab === "payments" && <Payments event={event} justPaid={searchParams.paid === "1"} />}
      {tab === "messages" && (
        <div className="card grid gap-5">
          <MessageThread messages={visibleMessages} viewerId={user.id} />
          <ResetForm action={postClientMessage} className="grid gap-3">
            <input type="hidden" name="eventId" value={event.id} />
            <textarea name="body" rows={3} required className="input" placeholder="Message your coordinator…" />
            <SubmitButton className="btn-primary w-fit" pendingLabel="Sending…">Send message</SubmitButton>
          </ResetForm>
        </div>
      )}
    </div>
  );
}

type Detail = NonNullable<Awaited<ReturnType<typeof loadEventDetail>>>;

async function Overview({ event, editable }: { event: Detail; editable: boolean }) {
  const [venues, packages] = await Promise.all([activeVenues(), activePackages()]);
  const schedule = event.scheduleItems.filter((s) => s.clientVisible);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="grid gap-6 lg:col-span-2">
        {event.status === "draft" && (
          <div className="card border-brand-200 bg-brand-50/60">
            <h2 className="section-title">Ready for a quote?</h2>
            <p className="mt-1 text-sm text-gray-700">
              Add the services, equipment, and catering you’d like, then submit. Your coordinator will send an itemized quote.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Pill tone={event.eventDate ? "green" : "amber"}>{event.eventDate ? "✓ Date set" : "Add a date"}</Pill>
              <Pill tone={event.guestCount ? "green" : "amber"}>{event.guestCount ? "✓ Guest count" : "Add guest count"}</Pill>
              <Pill tone={event.serviceRequests.length + event.cateringRequests.length > 0 ? "green" : "gray"}>
                {event.serviceRequests.length + event.cateringRequests.length} requests
              </Pill>
            </div>
            <form action={submitEvent} className="mt-4">
              <input type="hidden" name="eventId" value={event.id} />
              <SubmitButton pendingLabel="Submitting…" disabled={!event.eventDate || !event.guestCount}>Submit for a quote</SubmitButton>
            </form>
          </div>
        )}
        <div className="card">
          <h2 className="section-title mb-4">Event details</h2>
          {!editable && <p className="mb-4 text-sm text-gray-600">Your event is booked. To change details, message your coordinator.</p>}
          <EventForm action={updateEvent} event={event} venues={venues} packages={packages} submitLabel="Save details" disabled={!editable} />
        </div>
      </div>
      <div className="grid content-start gap-6">
        <div className="card grid gap-3 text-sm">
          <h2 className="section-title">At a glance</h2>
          <div className="flex gap-2"><UserRound className="h-4 w-4 text-gray-400" /><span>Coordinator: {event.coordinator ? <>{event.coordinator.name}{event.coordinator.phone && ` · ${event.coordinator.phone}`}</> : "Assigned after review"}</span></div>
          <div className="flex gap-2"><MapPin className="h-4 w-4 text-gray-400" /><span>{event.venue?.name ?? event.venueNotes ?? "Venue to be decided"}</span></div>
          <div className="flex gap-2"><Package className="h-4 w-4 text-gray-400" /><span>{event.package?.name ?? "À la carte"}</span></div>
          {event.startTime && <div className="flex gap-2"><CalendarDays className="h-4 w-4 text-gray-400" /><span>{formatTime(event.startTime)}{event.endTime && ` – ${formatTime(event.endTime)}`}</span></div>}
        </div>
        {schedule.length > 0 && (
          <div className="card">
            <h2 className="section-title mb-3">Day-of timeline</h2>
            <ol className="grid gap-2 text-sm">
              {schedule.map((s) => (
                <li key={s.id} className="flex gap-3"><span className="w-28 flex-none font-medium text-gray-700">{s.time}</span><span>{s.title}{s.details && <span className="block text-gray-500">{s.details}</span>}</span></li>
              ))}
            </ol>
          </div>
        )}
        <div className="card">
          <h2 className="section-title mb-3">Activity</h2>
          <ul className="grid gap-2 text-sm">
            {event.activity.slice(0, 10).map((a) => (
              <li key={a.id}><span className="text-gray-500">{formatDateTime(a.createdAt)}</span> — {a.action}</li>
            ))}
          </ul>
        </div>
        {editable && (
          <form action={cancelEvent}>
            <input type="hidden" name="eventId" value={event.id} />
            <SubmitButton className="btn-danger w-full" confirm="Cancel this event? This can't be undone online.">Cancel event</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

async function Services({ event, editable }: { event: Detail; editable: boolean }) {
  const catalog = await db.query.catalogItems.findMany({
    where: eq(schema.catalogItems.active, true),
    orderBy: [asc(schema.catalogItems.category), asc(schema.catalogItems.name)],
  });
  const groups = ["equipment", "service", "staffing", "decor"]
    .map((c) => ({ category: c, items: catalog.filter((i) => i.category === c) }))
    .filter((g) => g.items.length);
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="card lg:col-span-3">
        <h2 className="section-title mb-4">Your requests</h2>
        {event.serviceRequests.length === 0 ? (
          <EmptyState>No services or equipment requested yet.</EmptyState>
        ) : (
          <table className="table">
            <thead><tr><th>Item</th><th className="text-right">Qty</th><th>Status</th><th /></tr></thead>
            <tbody>
              {event.serviceRequests.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium">{r.description}</div>
                    {r.catalogItem && <div className="text-xs text-gray-500">{CATEGORY_LABELS[r.catalogItem.category]}</div>}
                    {r.notes && <div className="text-xs text-gray-600">{r.notes}</div>}
                  </td>
                  <td className="text-right">{r.quantity}</td>
                  <td><Pill tone={r.status === "approved" ? "green" : r.status === "declined" ? "red" : "gray"}>{r.status}</Pill></td>
                  <td className="text-right">
                    {editable && (
                      <form action={removeServiceRequest}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="requestId" value={r.id} />
                        <button className="text-gray-400 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {editable && (
        <div className="grid content-start gap-6 lg:col-span-2">
          <ResetForm action={addServiceRequest} className="card grid gap-4">
            <h2 className="section-title">Add from our catalog</h2>
            <input type="hidden" name="eventId" value={event.id} />
            <label className="label">
              Item
              <select name="catalogItemId" required className="input">
                {groups.map((g) => (
                  <optgroup key={g.category} label={CATEGORY_LABELS[g.category]}>
                    {g.items.map((i) => (
                      <option key={i.id} value={i.id}>{i.name} — {money(i.unitPrice)} {UNIT_LABELS[i.unit]}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="label">Quantity <span className="hint">per-guest items use your guest count</span><input name="quantity" type="number" min={1} defaultValue={1} className="input" /></label>
            <label className="label">Notes<input name="notes" className="input" placeholder="Color, style, timing…" /></label>
            <SubmitButton className="btn-primary w-fit">Add request</SubmitButton>
          </ResetForm>
          <ResetForm action={addServiceRequest} className="card grid gap-4">
            <h2 className="section-title">Something else?</h2>
            <input type="hidden" name="eventId" value={event.id} />
            <label className="label">What do you need?<input name="description" required className="input" placeholder="e.g. Kids’ entertainment, Sefer Torah transport" /></label>
            <label className="label">Quantity<input name="quantity" type="number" min={1} defaultValue={1} className="input" /></label>
            <label className="label">Notes<input name="notes" className="input" /></label>
            <SubmitButton className="btn-ghost w-fit">Add custom request</SubmitButton>
          </ResetForm>
        </div>
      )}
    </div>
  );
}

function Catering({ event, editable }: { event: Detail; editable: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="card lg:col-span-3">
        <h2 className="section-title mb-4">Catering requests</h2>
        {event.cateringRequests.length === 0 ? (
          <EmptyState>No catering requested yet. Tell us what you’re imagining and we’ll price it with our caterers.</EmptyState>
        ) : (
          <ul className="grid gap-4">
            {event.cateringRequests.map((c) => (
              <li key={c.id} className="rounded-xl border p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">{MEAL_TYPE_LABELS[c.mealType]} · {SERVICE_STYLE_LABELS[c.serviceStyle]} · {c.guestCount} guests</div>
                  <div className="flex items-center gap-2">
                    <Pill tone={c.status === "quoted" ? "blue" : "gray"}>{c.status}</Pill>
                    {editable && (
                      <form action={removeCateringRequest}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="requestId" value={c.id} />
                        <button className="text-gray-400 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                      </form>
                    )}
                  </div>
                </div>
                <dl className="mt-2 grid gap-1 text-gray-600">
                  {c.hechsher && <div>Hechsher: {c.hechsher}</div>}
                  {c.budgetPerGuest != null && <div>Target: {money(c.budgetPerGuest)} per guest</div>}
                  {c.menuNotes && <div>Menu: {c.menuNotes}</div>}
                  {c.dietaryNotes && <div>Dietary: {c.dietaryNotes}</div>}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
      {editable && (
        <ResetForm action={addCateringRequest} className="card grid content-start gap-4 lg:col-span-2">
          <h2 className="section-title">Request a catering quote</h2>
          <input type="hidden" name="eventId" value={event.id} />
          <div className="grid grid-cols-2 gap-3">
            <label className="label">Meal<select name="mealType" className="input"><Options map={MEAL_TYPE_LABELS} /></select></label>
            <label className="label">Service<select name="serviceStyle" className="input"><Options map={SERVICE_STYLE_LABELS} /></select></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="label">Guests eating<input name="guestCount" type="number" min={1} defaultValue={event.guestCount ?? ""} required className="input" /></label>
            <label className="label">Target $/guest<input name="budgetPerGuest" inputMode="decimal" className="input" placeholder="optional" /></label>
          </div>
          <label className="label">Hechsher preference<input name="hechsher" className="input" placeholder="e.g. ORB, KM, Cholov Yisroel, Glatt" /></label>
          <label className="label">Menu ideas<textarea name="menuNotes" rows={3} className="input" placeholder="Courses, cuisine, smorgasbord, Viennese table…" /></label>
          <label className="label">Allergies & dietary needs<input name="dietaryNotes" className="input" /></label>
          <SubmitButton className="btn-primary w-fit">Request catering quote</SubmitButton>
        </ResetForm>
      )}
    </div>
  );
}

function Quotes({ event, quotes }: { event: Detail; quotes: Detail["quotes"] }) {
  if (quotes.length === 0) {
    return (
      <EmptyState>
        {event.status === "draft"
          ? "Submit your event and your coordinator will prepare an itemized quote."
          : "Your coordinator is preparing your quote. We’ll email you when it’s ready."}
      </EmptyState>
    );
  }
  return (
    <div className="grid gap-6">
      {quotes.map((q) => (
        <div key={q.id} className={`card ${q.status === "sent" ? "border-sky-300 ring-2 ring-sky-100" : ""}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">Quote #{q.number}</h2>
            <Pill tone={q.status === "accepted" ? "green" : q.status === "sent" ? "blue" : q.status === "declined" ? "red" : "gray"}>
              {q.status === "sent" ? "awaiting your response" : q.status}
            </Pill>
          </div>
          <QuoteView quote={q} lines={q.lines} />
          {q.status === "sent" && (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-4">
              <form action={respondToQuote}>
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="quoteId" value={q.id} />
                <input type="hidden" name="decision" value="accept" />
                <SubmitButton pendingLabel="Booking…" confirm="Accept this quote and book your event? A payment schedule will be created.">Accept & book</SubmitButton>
              </form>
              <form action={respondToQuote}>
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="quoteId" value={q.id} />
                <input type="hidden" name="decision" value="decline" />
                <SubmitButton className="btn-ghost" confirm="Request changes? Your coordinator will be notified to revise the quote.">Request changes</SubmitButton>
              </form>
              <span className="text-xs text-gray-500">Questions? Use the Messages tab.</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Payments({ event, justPaid }: { event: Detail; justPaid: boolean }) {
  const plan = event.paymentPlan;
  if (!plan) return <EmptyState>Your payment schedule appears here once you accept a quote.</EmptyState>;
  const summary = paymentSummary(plan)!;
  const canPayOnline = Boolean(getStripe());
  const today = todayIso();
  const instructions = process.env.PAYMENT_INSTRUCTIONS ?? "Checks payable to “South Florida Simchah Initiative.” Zelle details are available from your coordinator.";
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        {justPaid && <p className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">Thank you! Your payment is processing and will appear here shortly.</p>}
        <h2 className="section-title mb-4">Payment schedule</h2>
        <table className="table">
          <thead><tr><th>Payment</th><th>Due</th><th className="text-right">Amount</th><th>Status</th><th /></tr></thead>
          <tbody>
            {plan.installments.map((i) => (
              <tr key={i.id}>
                <td className="font-medium">{i.label}</td>
                <td>{formatDate(i.dueDate)}</td>
                <td className="text-right">{money(i.amount)}</td>
                <td>
                  {i.status === "paid" ? (
                    <Pill tone="green">Paid {i.method ? `· ${PAYMENT_METHOD_LABELS[i.method]}` : ""}</Pill>
                  ) : i.status === "waived" ? (
                    <Pill>Waived</Pill>
                  ) : i.dueDate < today ? (
                    <Pill tone="red">Overdue</Pill>
                  ) : (
                    <Pill tone="amber">Due</Pill>
                  )}
                </td>
                <td className="text-right">
                  {i.status === "pending" && canPayOnline && (
                    <form action={payInstallment}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="installmentId" value={i.id} />
                      <SubmitButton className="btn-primary btn-sm" pendingLabel="Redirecting…">Pay now</SubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid content-start gap-6">
        <div className="card grid gap-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-medium">{money(plan.total)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="font-medium text-brand-700">{money(summary.paid)}</span></div>
          <div className="flex justify-between border-t pt-2 text-base"><span>Balance</span><span className="font-semibold">{money(summary.balance)}</span></div>
          {summary.next && <p className="text-xs text-gray-500">Next: {summary.next.label}, {money(summary.next.amount)} due {formatDate(summary.next.dueDate)}</p>}
        </div>
        <div className="card text-sm">
          <h3 className="font-medium">Paying offline</h3>
          <p className="mt-1 whitespace-pre-line text-gray-600">{instructions}</p>
        </div>
      </div>
    </div>
  );
}
