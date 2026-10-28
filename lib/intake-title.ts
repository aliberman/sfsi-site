// Suggested event name when none is given, e.g. "Gold–Stern Wedding".

const TYPE_NAMES: Record<string, string> = { wedding: "Wedding", bar_mitzvah: "Bar Mitzvah", bris: "Bris Milah" };

function lastName(full: string | null | undefined) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function suggestTitle(v: { type?: string | null; groomName?: string | null; brideName?: string | null; contactName?: string | null }) {
  const label = TYPE_NAMES[v.type ?? ""] ?? "Simchah";
  if (v.type === "wedding") {
    const names = [lastName(v.groomName), lastName(v.brideName)].filter(Boolean);
    if (names.length) return `${[...new Set(names)].join("–")} Wedding`;
  }
  const family = lastName(v.contactName);
  return family ? `${family} ${label}` : label;
}
