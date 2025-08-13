import Link from "next/link";

export default function GetInvolved() {
  return (
    <section className="bg-brand-50">
      <div className="container py-14">
        <div className="rounded-2xl bg-white border border-brand-100 shadow-sm p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-semibold">Be part of it — let’s celebrate here, together.</h2>
          <p className="mt-2 text-gray-600">Host your simchah with us, support a family, or join our vendor/venue network.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/plan" className="btn-primary">Start planning</Link>
            <Link href="/donate" className="btn-ghost border-brand-200">Donate monthly</Link>
            <Link href="/partners" className="btn-ghost border-brand-200">Apply as venue/vendor</Link>
            <Link href="/get-involved" className="btn-ghost border-brand-200">Spread the word</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
