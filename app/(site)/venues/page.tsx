import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { activeVenues } from "@/lib/public-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Venues & Vendors" };

export default async function VenuesVendorsPage() {
  const venues = await activeVenues();
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
      <div className="mt-12 card">
        <h2 className="text-xl font-semibold">Are you a venue or vendor?</h2>
        <p className="mt-2 text-gray-600">Join our network and help bring simchos home to South Florida.</p>
        <Link href="/partners" className="btn-primary mt-4">Apply as a partner</Link>
      </div>
    </section>
  );
}
