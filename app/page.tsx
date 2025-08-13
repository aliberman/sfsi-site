import Hero from "@/components/Hero";
import ImpactStrip from "@/components/ImpactStrip";
import Intro from "@/components/Intro";
import ImageShowcase from "@/components/ImageShowcase";
import PackageCard from "@/components/PackageCard";
import GetInvolved from "@/components/GetInvolved";

export default function HomePage() {
  const packages = [
    { name: "Essentials", price: "from $X", items: ["4-hour space rental", "Basic décor", "Tables/chairs/linens", "Event coordinator"] },
    { name: "Classic", price: "from $Y", items: ["Everything in Essentials", "Extended hours", "Simple stage/chuppah", "Sound system", "Basic photography"] },
    { name: "Simchah+", price: "from $Z", items: ["Everything in Classic", "Premium chuppah", "Band/DJ coordination", "Photo/video options", "On-site mashgiach (as applicable)"] }
  ];

  return (
    <>
      <Hero />
      <ImpactStrip />
      <Intro />
      <section className="container py-16">
        <h2 className="text-3xl font-semibold">Packages & Pricing</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {packages.map((p) => <PackageCard key={p.name} {...p} />)}
        </div>
      </section>
      <ImageShowcase />
      <GetInvolved />
    </>
  );
}
