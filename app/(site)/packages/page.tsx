import Link from "next/link";
import PackageGrid from "@/components/PackageGrid";
import { activePackages } from "@/lib/public-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Packages & Pricing" };

export default async function PackagesPage() {
  const packages = await activePackages();
  return (
    <section className="container py-16">
      <h1 className="font-display text-4xl font-semibold">Packages & pricing</h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        Start from a package, then add exactly what your simchah needs—catering, staffing, rentals, photography and
        more—in your family portal. Your coordinator turns it into one itemized quote, including any community subsidy
        you qualify for.
      </p>
      <div className="mt-10"><PackageGrid packages={packages} /></div>
      <div className="mt-12 card bg-brand-50 border-brand-100">
        <h2 className="text-xl font-semibold">Need help with cost?</h2>
        <p className="mt-2 text-gray-700">
          SFSI subsidizes simchos for families who need it, funded by monthly community donors. Mention it in your portal
          request and your coordinator will reach out confidentially.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/register" className="btn-primary">Start planning</Link>
          <Link href="/donate" className="btn-ghost">Support a family</Link>
        </div>
      </div>
    </section>
  );
}
