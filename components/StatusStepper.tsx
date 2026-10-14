import { Check } from "lucide-react";
import { EVENT_STATUS_LABELS } from "@/lib/format";

const FLOW = ["draft", "submitted", "quoted", "booked", "in_production", "completed"] as const;

export default function StatusStepper({ status }: { status: string }) {
  if (status === "cancelled") return <p className="text-sm text-rose-700">This event was cancelled.</p>;
  const current = FLOW.indexOf(status as (typeof FLOW)[number]);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
      {FLOW.map((s, i) => {
        const doneStep = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                doneStep ? "border-brand-600 bg-brand-600 text-white" : active ? "border-brand-600 text-brand-700" : "border-gray-300 text-gray-400"
              }`}
            >
              {doneStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={active ? "font-medium text-gray-900" : "text-gray-500"}>{EVENT_STATUS_LABELS[s]}</span>
            {i < FLOW.length - 1 && <span className="hidden h-px w-6 bg-gray-300 sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}
