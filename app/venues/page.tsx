import VenueCard from "@/components/VenueCard";

export default function VenuesVendorsPage() {
  return (
    <section className="container py-16">
      <h1 className="text-3xl font-semibold">Venues & Vendors</h1>
      <p className="mt-4 text-gray-600">A curated list is coming soon. Here’s a sample card layout:</p>
      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <VenueCard title="Shul Social Hall" capacity="250" neighborhood="North Miami Beach" shabbosFriendly={true}>
          <p className="text-sm text-gray-600">Great for bar/bat mitzvahs and micro-weddings.</p>
        </VenueCard>
        <VenueCard title="Community Center Ballroom" capacity="400" neighborhood="Hollywood" shabbosFriendly={true}>
          <p className="text-sm text-gray-600">Spacious, easy parking, flexible décor rules.</p>
        </VenueCard>
      </div>
    </section>
  );
}
