import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative">
      <div className="absolute inset-0">
        <Image src="/images/hero.jpg" alt="Elegant South Florida celebration" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>
      <div className="relative container py-20 md:py-28 text-white">
        <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-sm backdrop-blur">
          South Florida • Weddings • Bar/Bat Mitzvahs • Brissim
        </span>
        <h1 className="mt-5 text-4xl md:text-6xl font-semibold leading-tight">
          South Florida simchos,<span className="text-gold"> without compromise.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/90">
          Elegant venues, transparent pricing, and community-backed packages—so you can celebrate here at home.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/plan" className="btn-primary">Plan your simchah</Link>
          <Link href="/packages" className="btn-ghost border-white/30 text-white hover:bg-white/10">See packages & pricing</Link>
        </div>
      </div>
    </section>
  );
}
