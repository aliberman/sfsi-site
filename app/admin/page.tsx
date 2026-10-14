import Link from "next/link";
import { and, asc, count, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { addDays, daysUntil, EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, formatDate, money, TASK_CATEGORY_LABELS, todayIso } from "@/lib/format";
import { EmptyState, PageHeader, Pill, Stat, StatusBadge } from "@/components/ui";

export const metadata = { title: "Back office" };

export default async function AdminDashboard() {
  const today = todayIso();
  const [statusCounts, needsQuote, upcoming, overdue, receivable, dueTasks, newInquiries] = await Promise.all([
    db.select({ status: schema.events.status, n: count() }).from(schema.events).groupBy(schema.events.status),
    db.query.events.findMany({
      where: eq(schema.events.status, "submitted"),
      orderBy: [asc(schema.events.submittedAt)],
      with: { owner: { columns: { name: true } } },
    }),
    db.query.events.findMany({
      where: and(inArray(schema.events.status, ["booked", "in_production"]), gte(schema.events.eventDate, today), lte(schema.events.eventDate, addDays(today, 90))),
      orderBy: [asc(schema.events.eventDate)],
      with: { tasks: { columns: { status: true } }, staffAssignments: { columns: { status: true } } },
    }),
    db
      .select({
        id: schema.installments.id,
        label: schema.installments.label,
        amount: schema.installments.amount,
        dueDate: schema.installments.dueDate,
        eventId: schema.events.id,
        eventTitle: schema.events.title,
      })
      .from(schema.installments)
      .innerJoin(schema.paymentPlans, eq(schema.paymentPlans.id, schema.installments.planId))
      .innerJoin(schema.events, eq(schema.events.id, schema.paymentPlans.eventId))
      .where(and(eq(schema.installments.status, "pending"), sql`${schema.installments.dueDate} < ${today}`, ne(schema.events.status, "cancelled")))
      .orderBy(asc(schema.installments.dueDate)),
    db
      .select({ total: sql<number>`coalesce(sum(${schema.installments.amount}), 0)::int` })
      .from(schema.installments)
      .innerJoin(schema.paymentPlans, eq(schema.paymentPlans.id, schema.installments.planId))
      .innerJoin(schema.events, eq(schema.events.id, schema.paymentPlans.eventId))
      .where(and(eq(schema.installments.status, "pending"), ne(schema.events.status, "cancelled"))),
    db.query.tasks.findMany({
      where: and(ne(schema.tasks.status, "done"), lte(schema.tasks.dueDate, addDays(today, 7))),
      orderBy: [asc(schema.tasks.dueDate)],
      with: { event: { columns: { id: true, title: true, status: true } } },
      limit: 25,
    }),
    db.select({ n: count() }).from(schema.inquiries).where(eq(schema.inquiries.handled, false)),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));
  const activeTasks = dueTasks.filter((t) => t.event.status !== "cancelled" && t.event.status !== "completed");

  return (
    <div className="grid gap-8">
      <PageHeader title="Operations dashboard" subtitle={formatDate(today, { weekday: "long", month: "long", day: "numeric" })} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Awaiting quote" value={byStatus.submitted ?? 0} hint={`${byStatus.quoted ?? 0} quotes out with clients`} />
        <Stat label="Booked & in production" value={(byStatus.booked ?? 0) + (byStatus.in_production ?? 0)} hint={`${upcoming.length} in the next 90 days`} />
        <Stat label="Outstanding receivables" value={money(receivable[0]?.total ?? 0)} hint={overdue.length ? `${overdue.length} overdue installments` : "Nothing overdue"} />
        <Stat label="New inquiries" value={newInquiries[0]?.n ?? 0} hint={<Link href="/admin/inquiries" className="link">Review inquiries</Link>} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {Object.entries(EVENT_STATUS_LABELS).map(([s, l]) => (
          <Link key={s} href={`/admin/events?status=${s}`} className="rounded-full border bg-white px-3 py-1 hover:border-brand-300">
            {l} <span className="ml-1 text-gray-500">{byStatus[s] ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="section-title mb-3">Needs a quote</h2>
          {needsQuote.length === 0 ? <EmptyState>All caught up.</EmptyState> : (
            <ul className="divide-y text-sm">
              {needsQuote.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/events/${e.id}`} className="link font-medium">{e.title}</Link>
                  <span className="text-gray-500">{e.owner.name} · {formatDate(e.eventDate)} · {e.guestCount} guests</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="section-title mb-3">Overdue payments</h2>
          {overdue.length === 0 ? <EmptyState>No overdue installments.</EmptyState> : (
            <ul className="divide-y text-sm">
              {overdue.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/events/${i.eventId}?tab=payments`} className="link">{i.eventTitle}</Link>
                  <span><span className="text-gray-500">{i.label} · due {formatDate(i.dueDate)}</span> <strong>{money(i.amount)}</strong></span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="section-title mb-3">Upcoming events</h2>
          {upcoming.length === 0 ? <EmptyState>No booked events in the next 90 days.</EmptyState> : (
            <table className="table">
              <thead><tr><th>Event</th><th>Date</th><th>Tasks</th><th>Staff</th></tr></thead>
              <tbody>
                {upcoming.map((e) => {
                  const open = e.tasks.filter((t) => t.status !== "done").length;
                  const confirmed = e.staffAssignments.filter((s) => s.status === "confirmed").length;
                  return (
                    <tr key={e.id}>
                      <td><Link href={`/admin/events/${e.id}?tab=provisioning`} className="link font-medium">{e.title}</Link><div className="text-xs text-gray-500">{EVENT_TYPE_LABELS[e.type]} · {e.guestCount} guests</div></td>
                      <td className="whitespace-nowrap">{formatDate(e.eventDate)}<div className="text-xs text-gray-500">in {daysUntil(e.eventDate)} days</div></td>
                      <td>{open ? <Pill tone="amber">{open} open</Pill> : <Pill tone="green">done</Pill>}</td>
                      <td>{confirmed}/{e.staffAssignments.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2 className="section-title mb-3">Tasks due this week</h2>
          {activeTasks.length === 0 ? <EmptyState>No tasks due in the next 7 days.</EmptyState> : (
            <ul className="divide-y text-sm">
              {activeTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-medium">{t.title}</span>
                    <span className="block text-xs text-gray-500">
                      <Link href={`/admin/events/${t.event.id}?tab=provisioning`} className="link">{t.event.title}</Link> · {TASK_CATEGORY_LABELS[t.category]}
                    </span>
                  </span>
                  <Pill tone={t.dueDate && t.dueDate < today ? "red" : "amber"}>{formatDate(t.dueDate, { month: "short", day: "numeric" })}</Pill>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="text-xs text-gray-500"><StatusBadge status="booked" /> events automatically get a payment plan and provisioning checklist when the client accepts a quote.</p>
    </div>
  );
}
