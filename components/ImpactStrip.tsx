import { money } from "@/lib/format";
import { getImpactStats } from "@/lib/impact";

export default async function ImpactStrip() {
  const stats = await getImpactStats();
  const items = [
    { label: "Families hosted locally", value: stats.families?.toLocaleString("en-US") },
    { label: "Avg. savings vs. out-of-state", value: stats.savings != null ? money(stats.savings).replace(/\.\d\d$/, "") : undefined },
    { label: "Approved venues & vendors", value: stats.partners?.toLocaleString("en-US") },
  ].filter((i): i is { label: string; value: string } => Boolean(i.value));

  // Stats appear as real data accumulates; nothing is shown until there is something true to show.
  if (items.length === 0) return null;
  const cols = items.length === 3 ? "sm:grid-cols-3" : items.length === 2 ? "sm:grid-cols-2" : "";
  return (
    <section className="bg-navy text-white">
      <div className={`container grid grid-cols-1 gap-6 py-10 ${cols}`}>
        {items.map((i) => (
          <div key={i.label} className="text-center">
            <div className="text-3xl font-semibold text-gold">{i.value}</div>
            <div className="mt-1 text-sm text-white/80">{i.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
