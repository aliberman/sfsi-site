export default function ImpactStrip() {
  const items = [
    { label: "Families hosted locally", value: "42" },
    { label: "Avg. savings vs. out-of-state", value: "$5,100" },
    { label: "Approved vendors", value: "27" },
  ];
  return (
    <section className="bg-navy text-white">
      <div className="container py-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
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
