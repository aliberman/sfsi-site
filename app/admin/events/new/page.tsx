import Link from "next/link";
import { asc } from "drizzle-orm";
import { createOperatorEvent } from "@/app/actions/admin";
import EventIntakeForm from "@/components/EventIntakeForm";
import { pickVenueOptions } from "@/lib/intake-values";
import { PageHeader } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { requireOperator } from "@/lib/auth";

export const metadata = { title: "New event" };

export default async function NewOperatorEventPage() {
  await requireOperator();
  const venues = await db.query.venues.findMany({ orderBy: [asc(schema.venues.name)] });
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div className="text-sm"><Link href="/admin/events" className="link">← All events</Link></div>
      <PageHeader
        title="New event"
        subtitle="Create an event on a family’s behalf. It starts in “Submitted”, ready for a quote, and you’re set as coordinator."
      />
      <div className="card">
        <EventIntakeForm action={createOperatorEvent} venues={pickVenueOptions(venues)} submitLabel="Create event" />
      </div>
    </div>
  );
}
