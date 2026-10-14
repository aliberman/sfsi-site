import Link from "next/link";
import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, formatDate } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "Events" };

export default async function AdminEventsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const status = schema.eventStatus.enumValues.find((s) => s === searchParams.status);
  const q = searchParams.q?.trim();
  const filters: SQL[] = [];
  if (status) filters.push(eq(schema.events.status, status));
  if (q) filters.push(or(ilike(schema.events.title, `%${q}%`), ilike(schema.users.name, `%${q}%`), ilike(schema.users.email, `%${q}%`))!);

  const rows = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      type: schema.events.type,
      status: schema.events.status,
      eventDate: schema.events.eventDate,
      guestCount: schema.events.guestCount,
      ownerName: schema.users.name,
      ownerEmail: schema.users.email,
      createdAt: schema.events.createdAt,
    })
    .from(schema.events)
    .innerJoin(schema.users, eq(schema.users.id, schema.events.ownerId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(schema.events.eventDate), desc(schema.events.createdAt))
    .limit(200);

  return (
    <div className="grid gap-6">
      <PageHeader title="Events" subtitle="Every simchah in the pipeline." />
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search event, family, or email" className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="input max-w-[12rem]">
          <option value="">All statuses</option>
          {Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-ghost">Filter</button>
      </form>
      {rows.length === 0 ? <EmptyState>No events match.</EmptyState> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Event</th><th>Family</th><th>Date</th><th>Guests</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td><Link href={`/admin/events/${e.id}`} className="link font-medium">{e.title}</Link><div className="text-xs text-gray-500">{EVENT_TYPE_LABELS[e.type]}</div></td>
                  <td>{e.ownerName}<div className="text-xs text-gray-500">{e.ownerEmail}</div></td>
                  <td className="whitespace-nowrap">{formatDate(e.eventDate)}</td>
                  <td>{e.guestCount ?? "—"}</td>
                  <td><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
