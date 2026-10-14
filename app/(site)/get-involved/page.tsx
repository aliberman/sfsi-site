import Link from "next/link";
import { Building2, HandHeart, Megaphone, PartyPopper } from "lucide-react";

export const metadata = { title: "Get Involved" };

const WAYS = [
  { icon: PartyPopper, title: "Host your simchah", body: "Celebrate locally with a transparent package and a dedicated coordinator.", href: "/plan", cta: "Plan your simchah" },
  { icon: HandHeart, title: "Donate monthly", body: "Monthly donors fund the subsidies that make simchos affordable for every family.", href: "/donate", cta: "Support families" },
  { icon: Building2, title: "Partner with us", body: "Venues, caterers, and vendors: join our values-aligned network.", href: "/partners", cta: "Apply as a partner" },
  { icon: Megaphone, title: "Spread the word", body: "Share floridasimchah.org with friends, family, and your shul.", href: "/contact", cta: "Get in touch" },
];

export default function GetInvolvedPage() {
  return (
    <section className="container py-16">
      <h1 className="font-display text-4xl font-semibold">Get involved</h1>
      <p className="mt-3 max-w-2xl text-gray-600">There are four great ways to help bring simchos home to South Florida.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {WAYS.map((w) => (
          <div key={w.title} className="card">
            <w.icon className="h-6 w-6 text-brand-600" />
            <h2 className="mt-3 text-lg font-semibold">{w.title}</h2>
            <p className="mt-1 text-gray-600">{w.body}</p>
            <Link href={w.href} className="link mt-4 inline-block text-sm font-medium">{w.cta} →</Link>
          </div>
        ))}
      </div>
    </section>
  );
}
