import { asc, eq } from "drizzle-orm";
import { createEvent } from "@/app/actions/portal";
import EventIntakeForm from "@/components/EventIntakeForm";
import { PageHeader } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { pickFamilyVenueOptions } from "@/lib/intake-values";
import { activePackages } from "@/lib/public-data";

export const metadata = { title: "New event" };

export default async function NewEventPage({ searchParams }: { searchParams: { package?: string } }) {
  const [venues, packages] = await Promise.all([
    db.query.venues.findMany({ where: eq(schema.venues.active, true), orderBy: [asc(schema.venues.name)] }),
    activePackages(),
  ]);
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        title="Plan a new simchah"
        subtitle="Tell us about your simchah. Fill in what you know now; you can update details until the SFSI office locks them."
      />
      <div className="card">
        <EventIntakeForm
          action={createEvent}
          mode="family"
          event={{ packageId: searchParams.package ?? null }}
          venues={pickFamilyVenueOptions(venues)}
          packages={packages.map((p) => ({ id: p.id, name: p.name }))}
          submitLabel="Create event & add services"
        />
      </div>
    </div>
  );
}
