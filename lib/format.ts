// Display helpers and human-readable labels for enum values.

export function money(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** Parses a dollar amount typed into a form ("1,250.50") into cents. */
export function toCents(value: FormDataEntryValue | null | undefined): number | null {
  if (value == null) return null;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsToInput(cents: number | null | undefined) {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

/** Formats a YYYY-MM-DD date column without timezone drift. */
export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "TBD";
  const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
  return d.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function daysUntil(isoDate: string | null | undefined) {
  if (!isoDate) return null;
  const target = new Date(`${isoDate}T12:00:00`).getTime();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86_400_000);
}

export function todayIso() {
  return isoDate(new Date());
}

export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  bar_mitzvah: "Bar Mitzvah",
  bat_mitzvah: "Bat Mitzvah",
  bris: "Bris",
  kiddush: "Kiddush",
  sheva_brachos: "Sheva Brachos",
  upsherin: "Upsherin",
  engagement: "Vort / Engagement",
  other: "Other",
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  quoted: "Quote ready",
  booked: "Booked",
  in_production: "In production",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const EVENT_STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-amber-100 text-amber-800",
  quoted: "bg-sky-100 text-sky-800",
  booked: "bg-brand-100 text-brand-800",
  in_production: "bg-violet-100 text-violet-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-700",
};

export const CATEGORY_LABELS: Record<string, string> = {
  equipment: "Equipment & rentals",
  service: "Services",
  staffing: "Staffing",
  catering: "Catering",
  decor: "Décor & florals",
  venue: "Venue",
};

export const UNIT_LABELS: Record<string, string> = {
  each: "each",
  per_guest: "per guest",
  per_hour: "per hour",
  flat: "flat",
};

export const MEAL_TYPE_LABELS: Record<string, string> = { meat: "Meat (fleishig)", dairy: "Dairy (milchig)", pareve: "Pareve" };

export const SERVICE_STYLE_LABELS: Record<string, string> = {
  plated: "Plated",
  buffet: "Buffet",
  family_style: "Family style",
  stations: "Stations",
  kiddush: "Kiddush spread",
  cocktail: "Cocktail / passed",
};

export const STAFF_ROLE_LABELS: Record<string, string> = {
  coordinator: "Event coordinator",
  server: "Server / waiter",
  bartender: "Bartender",
  chef: "Chef / kitchen",
  mashgiach: "Mashgiach",
  setup_crew: "Setup crew",
  photographer: "Photographer",
  videographer: "Videographer",
  musician: "Musician / DJ",
  security: "Security",
  valet: "Valet / parking",
  other: "Other",
};

export const TASK_CATEGORY_LABELS: Record<string, string> = {
  planning: "Planning",
  staffing: "Staffing",
  equipment: "Equipment",
  catering: "Catering",
  logistics: "Logistics",
  vendor: "Vendors",
  finance: "Finance",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Card (online)",
  check: "Check",
  zelle: "Zelle",
  ach: "Bank transfer",
  cash: "Cash",
  other: "Other",
};

export function label(map: Record<string, string>, key: string | null | undefined) {
  if (!key) return "";
  return map[key] ?? key;
}

/** "18:30" → "6:30 PM"; passes through free-form text unchanged. */
export function formatTime(value: string | null | undefined) {
  if (!value) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}
