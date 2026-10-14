import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative">
      <div className="absolute inset-0">
        <Image src="/images/hero.jpg" alt="Elegant South Florida celebration" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>
      <div className="relative container py-24 text-white md:py-32">
        <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-sm backdrop-blur">
          South Florida • Weddings • Bar/Bat Mitzvahs • Brissim
        </span>
        <h1 className="font-display mt-5 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
          South Florida simchos,<span className="text-gold"> without compromise.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/90">
          Elegant venues, transparent pricing, and community-backed packages—so you can celebrate here at home.
          Plan everything in one place, from catering quotes to your payment plan.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/register" className="btn-gold px-5 py-3">Start planning online</Link>
          <Link href="/packages" className="btn px-5 py-3 border border-white/40 text-white hover:bg-white/10">See packages & pricing</Link>
        </div>
      </div>
    </section>
  );
}
