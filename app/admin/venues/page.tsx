import { asc } from "drizzle-orm";
import { saveVenue } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Pill } from "@/components/ui";
import { db, schema } from "@/lib/db";

export const metadata = { title: "Venues" };

type Venue = typeof schema.venues.$inferSelect;

function VenueForm({ v }: { v?: Venue }) {
  return (
    <form action={saveVenue} className="grid gap-3 sm:grid-cols-6">
      {v && <input type="hidden" name="id" value={v.id} />}
      <label className="label sm:col-span-2">Name<input name="name" required defaultValue={v?.name} className="input" /></label>
      <label className="label sm:col-span-2">Neighborhood<input name="neighborhood" defaultValue={v?.neighborhood ?? ""} className="input" /></label>
      <label className="label">Capacity<input name="capacity" type="number" min={0} defaultValue={v?.capacity ?? ""} className="input" /></label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="shabbosFriendly" defaultChecked={v?.shabbosFriendly ?? false} /> Shabbos-friendly</label>
      <label className="label sm:col-span-6">Address<input name="address" defaultValue={v?.address ?? ""} className="input" /></label>
      <label className="label sm:col-span-2">Venue contact <span className="hint">internal only</span><input name="contactName" defaultValue={v?.contactName ?? ""} className="input" /></label>
      <label className="label sm:col-span-2">Contact phone<input name="contactPhone" type="tel" defaultValue={v?.contactPhone ?? ""} className="input" /></label>
      <label className="label sm:col-span-2">Contact email<input name="contactEmail" type="email" defaultValue={v?.contactEmail ?? ""} className="input" /></label>
      <label className="label sm:col-span-5">Description<input name="description" defaultValue={v?.description ?? ""} className="input" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={v?.active ?? true} /> Listed publicly</label>
      <SubmitButton className="btn-primary w-fit">{v ? "Save" : "Add venue"}</SubmitButton>
    </form>
  );
}

export default async function VenuesAdminPage() {
  const venues = await db.query.venues.findMany({ orderBy: [asc(schema.venues.name)] });
  return (
    <div className="grid gap-6">
      <PageHeader title="Venues" subtitle="Shown on the public Venues page and offered when families plan an event." />
      <div className="card"><h2 className="section-title mb-4">New venue</h2><VenueForm /></div>
      <div className="card p-0">
        {venues.map((v) => (
          <details key={v.id} className="border-b px-5 py-3 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span><span className="font-medium">{v.name}</span> <span className="text-gray-500">· {v.neighborhood} · {v.capacity ?? "?"} guests</span></span>
              {!v.active && <Pill>hidden</Pill>}
            </summary>
            <div className="pt-4"><VenueForm v={v} /></div>
          </details>
        ))}
      </div>
    </div>
  );
}
