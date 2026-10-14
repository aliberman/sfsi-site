import Link from "next/link";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold">About SFSI</h1>
      <div className="mt-6 space-y-4 text-lg text-gray-700">
        <p>
          The South Florida Simchah Initiative is a community initiative making local simchos practical and dignified.
          We partner with shuls, schools, and values-aligned venues to offer transparent packages while saving families
          the cost and complexity of traveling out of state.
        </p>
        <p>
          For too long, families have felt pressured to travel up north to “Takanah” halls for weddings and
          bar/bat mitzvahs—adding cost, stress, and distance from loved ones. We believe simchos should be{" "}
          <strong>local, affordable, and dignified</strong>, without compromising on elegance, tradition, or halachic
          integrity.
        </p>
        <p>
          Our coordinators handle the details—venue, catering, staffing, rentals, and vendors—and our family portal keeps
          every request, quote, and payment in one place.
        </p>
      </div>
      <div className="mt-8 flex gap-3">
        <Link href="/plan" className="btn-primary">Plan your simchah</Link>
        <Link href="/get-involved" className="btn-ghost">Get involved</Link>
      </div>
    </section>
  );
}
