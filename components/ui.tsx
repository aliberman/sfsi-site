import Link from "next/link";
import { EVENT_STATUS_LABELS, EVENT_STATUS_STYLES } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${EVENT_STATUS_STYLES[status] ?? "bg-gray-100"}`}>{EVENT_STATUS_LABELS[status] ?? status}</span>;
}

export function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-800",
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-gray-600">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">{children}</div>;
}

export function Tabs({ base, current, tabs }: { base: string; current: string; tabs: { key: string; label: string; count?: number }[] }) {
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b">
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={`${base}?tab=${t.key}`}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              active ? "border-brand-600 font-medium text-brand-700" : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
            {t.count ? <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">{t.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

export function Options({ map, include }: { map: Record<string, string>; include?: readonly string[] }) {
  const keys = include ?? Object.keys(map);
  return (
    <>
      {keys.map((k) => (
        <option key={k} value={k}>
          {map[k] ?? k}
        </option>
      ))}
    </>
  );
}
