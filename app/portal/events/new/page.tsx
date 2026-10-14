import { createEvent } from "@/app/actions/portal";
import EventForm from "@/components/EventForm";
import { PageHeader } from "@/components/ui";
import { activePackages, activeVenues } from "@/lib/public-data";

export const metadata = { title: "New event" };

export default async function NewEventPage({ searchParams }: { searchParams: { package?: string } }) {
  const [venues, packages] = await Promise.all([activeVenues(), activePackages()]);
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="Plan a new simchah" subtitle="Start with the basics—you can change anything until your event is booked." />
      <div className="card">
        <EventForm action={createEvent} venues={venues} packages={packages} defaultPackageId={searchParams.package} submitLabel="Create event & add services" />
      </div>
    </div>
  );
}
