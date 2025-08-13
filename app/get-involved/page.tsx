import Link from "next/link";

export default function GetInvolvedPage() {
  return (
    <section className="container py-16 max-w-2xl">
      <h1 className="text-3xl font-semibold">Get Involved</h1>
      <p className="mt-4 text-gray-700">
        There are four great ways to help bring simchos home to South Florida.
      </p>
      <ul className="mt-6 list-disc pl-5 text-gray-700 space-y-2">
        <li><strong>Host your simchah:</strong> <Link href="/plan" className="underline">Plan your simchah</Link></li>
        <li><strong>Donate monthly:</strong> <Link href="/donate" className="underline">Support families in need</Link></li>
        <li><strong>Partner with us:</strong> <Link href="/partners" className="underline">Apply as a venue/vendor</Link></li>
        <li><strong>Spread the word:</strong> Share our site and mission with friends and family</li>
      </ul>
    </section>
  );
}
