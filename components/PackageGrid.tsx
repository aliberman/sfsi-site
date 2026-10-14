import Link from "next/link";
import { Check } from "lucide-react";
import { money } from "@/lib/format";

type Pkg = { id: string; name: string; tagline: string | null; startingPrice: number | null; features: string[] };

export default function PackageGrid({ packages }: { packages: Pkg[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {packages.map((p, i) => (
        <div key={p.id} className={`card flex flex-col ${i === 1 ? "border-brand-300 ring-2 ring-brand-100" : ""}`}>
          <h3 className="font-display text-xl font-semibold">{p.name}</h3>
          {p.tagline && <p className="mt-1 text-sm text-gray-600">{p.tagline}</p>}
          <div className="mt-4 text-sm text-gray-500">
            {p.startingPrice != null ? (
              <>from <span className="text-2xl font-semibold text-gray-900">{money(p.startingPrice).replace(/\.00$/, "")}</span></>
            ) : (
              <span className="font-medium text-gray-900">Pricing on request</span>
            )}
          </div>
          <ul className="mt-5 grid flex-1 gap-2 text-sm text-gray-700">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-brand-600" />{f}</li>
            ))}
          </ul>
          <Link href={`/register?package=${p.id}`} className="btn-ghost mt-6">Plan with {p.name}</Link>
        </div>
      ))}
    </div>
  );
}
