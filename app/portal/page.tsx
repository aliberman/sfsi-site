import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CalendarDays, Plus, Users } from "lucide-react";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { daysUntil, EVENT_TYPE_LABELS, formatDate } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "My events" };

const NEXT_STEP: Record<string, string> = {
  draft: "Add your requests and submit for a quote",
  submitted: "Your coordinator is preparing a quote",
  quoted: "Your quote is ready to review",
  booked: "Booked — see your payment schedule",
  in_production: "We’re finalizing staff and logistics",
  completed: "Mazel tov!",
  cancelled: "Cancelled",
};

export default async function PortalHome() {
  const user = await requireUser();
  const events = await db.query.events.findMany({
    where: eq(schema.events.ownerId, user.id),
    orderBy: [desc(schema.events.createdAt)],
    with: { venue: true },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Plan and track every part of your simchah."
        actions={<Link href="/portal/events/new" className="btn-primary"><Plus className="h-4 w-4" />New event</Link>}
      />
      {events.length === 0 ? (
        <EmptyState>
          <p className="text-base text-gray-700">You haven’t started planning yet.</p>
          <Link href="/portal/events/new" className="btn-primary mt-4">Plan your first simchah</Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => {
            const days = daysUntil(e.eventDate);
            return (
              <Link key={e.id} href={`/portal/events/${e.id}`} className="card block transition hover:border-brand-300 hover:shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">{EVENT_TYPE_LABELS[e.type]}</div>
                    <h2 className="mt-0.5 text-lg font-semibold">{e.title}</h2>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(e.eventDate)}{days != null && days >= 0 && ` · in ${days} days`}</span>
                  {e.guestCount ? <span className="flex items-center gap-1"><Users className="h-4 w-4" />{e.guestCount} guests</span> : null}
                </div>
                <p className="mt-3 text-sm text-brand-700">{NEXT_STEP[e.status]} →</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
