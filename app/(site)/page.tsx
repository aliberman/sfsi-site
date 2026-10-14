import Link from "next/link";
import Hero from "@/components/Hero";
import ImpactStrip from "@/components/ImpactStrip";
import Intro from "@/components/Intro";
import HowItWorks from "@/components/HowItWorks";
import ImageShowcase from "@/components/ImageShowcase";
import PackageGrid from "@/components/PackageGrid";
import GetInvolved from "@/components/GetInvolved";
import { activePackages } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const packages = await activePackages();
  return (
    <>
      <Hero />
      <ImpactStrip />
      <Intro />
      <HowItWorks />
      <section className="container py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Packages & pricing</h2>
            <p className="mt-2 text-gray-600">Transparent, community-backed packages. Every item can be tailored in your portal.</p>
          </div>
          <Link href="/packages" className="link text-sm">Compare packages →</Link>
        </div>
        <div className="mt-8"><PackageGrid packages={packages} /></div>
      </section>
      <ImageShowcase />
      <GetInvolved />
    </>
  );
}
