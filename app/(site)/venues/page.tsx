import Link from "next/link";
import { Globe, MapPin, Phone, Users } from "lucide-react";
import { VENDOR_CATEGORY_LABELS } from "@/lib/format";
import { activeVendors, activeVenues } from "@/lib/public-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Venues & Vendors" };

export default async function VenuesVendorsPage() {
  const [venues, vendors] = await Promise.all([activeVenues(), activeVendors()]);
  const vendorGroups = Object.keys(VENDOR_CATEGORY_LABELS)
    .map((c) => ({ category: c, items: vendors.filter((v) => v.category === c) }))
    .filter((g) => g.items.length);
  return (
    <section className="container py-16">
      <h1 className="font-display text-4xl font-semibold">Venues & vendors</h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        Values-aligned shuls, schools, and halls across South Florida, plus a vetted network of caterers, musicians,
        photographers, and rental partners.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {venues.map((v) => (
          <div key={v.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{v.name}</h2>
              {v.shabbosFriendly && <span className="badge bg-brand-100 text-brand-800">Shabbos-friendly</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              {v.neighborhood && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{v.neighborhood}</span>}
              {v.capacity && <span className="flex items-center gap-1"><Users className="h-4 w-4" />Up to {v.capacity} guests</span>}
            </div>
            {v.description && <p className="mt-3 text-sm text-gray-700">{v.description}</p>}
          </div>
        ))}
        {venues.length === 0 && <p className="text-gray-500">Our venue list is being finalized—check back soon.</p>}
      </div>
      {vendorGroups.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-3xl font-semibold">Approved vendors</h2>
          <div className="mt-6 grid gap-8">
            {vendorGroups.map((g) => (
              <div key={g.category}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{VENDOR_CATEGORY_LABELS[g.category]}</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  {g.items.map((v) => (
                    <div key={v.id} className="card p-5 text-sm">
                      <div className="font-semibold">{v.name}</div>
                      {v.hechsher && <div className="mt-1 text-xs text-brand-700">{v.hechsher}</div>}
                      {v.description && <p className="mt-2 text-gray-600">{v.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-3 text-gray-600">
                        {v.website && <a href={v.website} target="_blank" rel="noreferrer" className="link flex items-center gap-1"><Globe className="h-4 w-4" />Website</a>}
                        {v.phone && <a href={`tel:${v.phone}`} className="link flex items-center gap-1"><Phone className="h-4 w-4" />{v.phone}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-12 card">
        <h2 className="text-xl font-semibold">Are you a venue or vendor?</h2>
        <p className="mt-2 text-gray-600">Join our network and help bring simchos home to South Florida.</p>
        <Link href="/partners" className="btn-primary mt-4">Apply as a partner</Link>
      </div>
    </section>
  );
}
