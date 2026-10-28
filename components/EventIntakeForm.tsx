"use client";

import { useRef, useState } from "react";
import {
  Baby,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gem,
  MapPin,
  NotebookPen,
  Pencil,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { suggestTitle } from "@/lib/intake-title";

// The event intake wizard, used by operators in the back office and by families in the portal.

export type VenueOption = {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  capacity: number | null;
  active: boolean;
};

export type PackageOption = { id: string; name: string };

export type IntakeValues = {
  id?: string;
  title?: string;
  type?: string;
  eventDate?: string | null;
  guestCount?: number | null;
  venueId?: string | null;
  packageId?: string | null;
  budget?: number | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  groomName?: string | null;
  groomParents?: string | null;
  brideName?: string | null;
  brideParents?: string | null;
  groomContactName?: string | null;
  groomContactPhone?: string | null;
  groomContactEmail?: string | null;
  brideContactName?: string | null;
  brideContactPhone?: string | null;
  brideContactEmail?: string | null;
  plannerName?: string | null;
  plannerCompany?: string | null;
  plannerPhone?: string | null;
  plannerEmail?: string | null;
  cocktailsTime?: string | null;
  ceremonyTime?: string | null;
  dessertTime?: string | null;
  venueAccessTime?: string | null;
  venueOutTime?: string | null;
  notes?: string | null;
};

const TYPES: { value: string; label: string; blurb: string; icon: LucideIcon }[] = [
  { value: "wedding", label: "Wedding", blurb: "Chuppah, seudah & simchah", icon: Gem },
  { value: "bar_mitzvah", label: "Bar Mitzvah", blurb: "Kiddush, seudah or party", icon: BookOpen },
  { value: "bris", label: "Bris Milah", blurb: "Bris & seudas mitzvah", icon: Baby },
];

const TIME_LABELS: Record<string, { cocktails: string; ceremony: string }> = {
  wedding: { cocktails: "Kabbalas Panim / cocktails", ceremony: "Chuppah" },
  bar_mitzvah: { cocktails: "Reception / cocktails", ceremony: "Ceremony / speeches" },
  bris: { cocktails: "Reception", ceremony: "Bris" },
};

const NEW_VENUE = "__new";

type StepKey = "type" | "when" | "people" | "venue" | "times" | "extras" | "review";
type Step = { key: StepKey; title: string; icon: LucideIcon };

function formatTime(value: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default function EventIntakeForm({
  action,
  event,
  venues,
  packages = [],
  submitLabel,
  mode = "operator",
  readOnly = false,
  hasPortalAccount,
}: {
  action: (fd: FormData) => Promise<void>;
  event?: IntakeValues;
  venues: VenueOption[];
  packages?: PackageOption[];
  submitLabel: string;
  mode?: "operator" | "family";
  readOnly?: boolean;
  hasPortalAccount?: boolean;
}) {
  const family = mode === "family";
  const editing = Boolean(event?.id);
  const formRef = useRef<HTMLFormElement>(null);
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [type, setType] = useState(event?.type ?? "");
  const [venueId, setVenueId] = useState(event?.venueId ?? "");
  const [hasPlanner, setHasPlanner] = useState(Boolean(event?.plannerName || event?.plannerCompany || event?.plannerPhone || event?.plannerEmail));
  const [values, setValues] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState(editing ? Infinity : 0);

  const wedding = type === "wedding";
  const legacyType = Boolean(type) && !TYPES.some((t) => t.value === type);
  const venue = venues.find((v) => v.id === venueId);
  const isNewVenue = venueId === NEW_VENUE;
  // Families see a listed venue's address but can only edit a venue they added themselves.
  const venueEditable = isNewVenue || Boolean(venue && (!family || !venue.active));
  const labels = TIME_LABELS[type] ?? { cocktails: "Reception / cocktails", ceremony: "Ceremony" };
  const v = (key: keyof IntakeValues) => (event?.[key] as string | number | null | undefined) ?? "";

  const steps: Step[] = [
    { key: "type", title: "Simchah", icon: Sparkles },
    { key: "when", title: "Date & guests", icon: CalendarDays },
    // Families planning a bar mitzvah or bris have no people questions to answer.
    ...(wedding || !family ? [{ key: "people" as const, title: wedding ? "Chosson & kallah" : "Family", icon: Users }] : []),
    { key: "venue", title: "Venue", icon: MapPin },
    { key: "times", title: "Times", icon: Clock },
    { key: "extras", title: "Extras", icon: NotebookPen },
    { key: "review", title: "Review", icon: Check },
  ];
  const current = steps[Math.min(index, steps.length - 1)];
  const isLast = current.key === "review";

  /** Snapshot of the form, used by the review step and the title suggestion. */
  function snapshot() {
    if (!formRef.current) return {};
    return Object.fromEntries([...new FormData(formRef.current)].map(([k, val]) => [k, String(val)]));
  }

  function validate(key: StepKey) {
    const el = stepRefs.current[key];
    const invalid = el ? [...el.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select, textarea")].find((f) => !f.checkValidity()) : null;
    return invalid ?? null;
  }

  function goTo(target: number) {
    // Moving forward checks every step in between, so required answers aren't skipped.
    for (let i = index; i < target; i++) {
      const invalid = validate(steps[i].key);
      if (invalid) {
        setIndex(i);
        requestAnimationFrame(() => invalid.reportValidity());
        return;
      }
    }
    setValues(snapshot());
    setIndex(target);
    setVisited((n) => Math.max(n, target));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Fields on other steps are hidden, so validate them ourselves and jump to the first problem.
    for (let i = 0; i < steps.length; i++) {
      const invalid = validate(steps[i].key);
      if (invalid) {
        e.preventDefault();
        setIndex(i);
        requestAnimationFrame(() => invalid.reportValidity());
        return;
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    // Enter in a field moves to the next step instead of saving part-way through.
    if (e.key === "Enter" && !isLast && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      goTo(index + 1);
    }
  }

  if (readOnly) {
    const shown: Record<string, string> = Object.fromEntries(
      Object.entries(event ?? {}).map(([k, val]) => [k, val == null ? "" : String(val)]),
    );
    if (event?.budget != null) shown.budget = (event.budget / 100).toLocaleString("en-US");
    return (
      <Summary
        values={shown}
        venues={venues}
        packages={packages}
        family={family}
      />
    );
  }

  const stepClass = (key: StepKey) => (current.key === key ? "grid gap-5" : "hidden");

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate className="grid gap-6">
      {event?.id && <input type="hidden" name="eventId" value={event.id} />}

      {/* Stepper */}
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => {
          const done = i < index;
          const active = i === index;
          const reachable = i <= visited;
          return (
            <li key={s.key} className="flex flex-none items-center gap-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => (i < index ? setIndex(i) : goTo(i))}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : done
                      ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
                      : reachable
                        ? "text-gray-600 hover:bg-gray-100"
                        : "text-gray-400"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                <span className={active ? "" : "hidden sm:inline"}>{s.title}</span>
              </button>
              {i < steps.length - 1 && <span className="h-px w-3 bg-gray-200" />}
            </li>
          );
        })}
      </ol>

      {/* 1. Type */}
      <div ref={(el) => { stepRefs.current.type = el; }} className={stepClass("type")}>
        <StepHeading icon={Sparkles} title="What are we celebrating?" />
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPES.map((t) => (
            <label
              key={t.value}
              className={`group relative flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 text-left transition sm:flex-col sm:gap-3 sm:p-6 sm:text-center ${
                type === t.value ? "border-brand-500 bg-brand-50/60 shadow-sm" : "border-gray-200 hover:border-brand-200 hover:bg-gray-50"
              }`}
            >
              <input type="radio" name="type" value={t.value} required={!legacyType} checked={type === t.value} onChange={() => setType(t.value)} className="sr-only" />
              <span className={`flex h-12 w-12 flex-none items-center sm:h-14 sm:w-14 justify-center rounded-full transition ${type === t.value ? "bg-brand-600 text-white" : "bg-gold/15 text-navy group-hover:bg-gold/25"}`}>
                <t.icon className="h-7 w-7" strokeWidth={1.5} />
              </span>
              <span className="grid gap-1">
                <span className="font-display text-lg font-semibold">{t.label}</span>
                <span className="text-xs text-gray-500">{t.blurb}</span>
              </span>
              {type === t.value && <Check className="absolute right-3 top-3 h-4 w-4 text-brand-600" />}
            </label>
          ))}
          {/* Older events may carry a type outside the three above. */}
          {legacyType && <input type="hidden" name="type" value={type} />}
        </div>
      </div>

      {/* 2. Date & guests */}
      <div ref={(el) => { stepRefs.current.when = el; }} className={stepClass("when")}>
        <StepHeading icon={CalendarDays} title="When is it, and how many guests?" hint={family ? "Not sure yet? Leave it blank and fill it in later." : undefined} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field icon={CalendarDays} label="Date">
            <input name="eventDate" type="date" required={!family} defaultValue={v("eventDate")} className="input" />
          </Field>
          <Field icon={Users} label="Expected guests">
            <input name="guestCount" type="number" min={0} max={5000} defaultValue={v("guestCount")} className="input" placeholder="e.g. 250" />
          </Field>
        </div>
      </div>

      {/* 3. People */}
      <div ref={(el) => { stepRefs.current.people = el; }} className={steps.some((s) => s.key === "people") ? stepClass("people") : "hidden"}>
        <StepHeading icon={Users} title={wedding ? "Who’s getting married?" : "Who should we be in touch with?"} />
        {wedding && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["groom", "bride"] as const).map((side) => (
              <div key={side} className="grid content-start gap-3 rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-navy"><Users className="h-3.5 w-3.5" /></span>
                  {side === "groom" ? "Chosson" : "Kallah"}
                </div>
                <label className="label">Name<input name={`${side}Name`} defaultValue={v(`${side}Name`)} className="input" /></label>
                <label className="label">Parents<input name={`${side}Parents`} defaultValue={v(`${side}Parents`)} className="input" placeholder={side === "groom" ? "Mr. & Mrs. Yosef Cohen" : "Rabbi & Mrs. Dovid Levy"} /></label>
                <details className="group/d rounded-xl bg-gray-50 px-3 py-2" open={Boolean(v(`${side}ContactName`) || v(`${side}ContactPhone`) || v(`${side}ContactEmail`))}>
                  <summary className="cursor-pointer list-none text-sm font-medium text-brand-700">
                    <span className="group-open/d:hidden">+ Add {side === "groom" ? "chosson’s" : "kallah’s"} side contact</span>
                    <span className="hidden group-open/d:inline">{side === "groom" ? "Chosson’s" : "Kallah’s"} side: responsible party</span>
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <input name={`${side}ContactName`} defaultValue={v(`${side}ContactName`)} className="input" placeholder="Name" aria-label="Responsible party name" />
                    <div className="grid grid-cols-2 gap-3">
                      <input name={`${side}ContactPhone`} type="tel" defaultValue={v(`${side}ContactPhone`)} className="input" placeholder="Phone" aria-label="Responsible party phone" />
                      <input name={`${side}ContactEmail`} type="email" defaultValue={v(`${side}ContactEmail`)} className="input" placeholder="Email" aria-label="Responsible party email" />
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
        {!family && (
          <div className="grid gap-3 rounded-2xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-800">Primary family contact</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="label">Name<input name="contactName" defaultValue={v("contactName")} className="input" /></label>
              <label className="label">Email<input name="contactEmail" type="email" defaultValue={v("contactEmail")} className="input" /></label>
              <label className="label">Phone<input name="contactPhone" type="tel" defaultValue={v("contactPhone")} className="input" /></label>
            </div>
            <p className="hint">{hasPortalAccount ? "Linked to the family’s portal account." : "The event appears in the family’s portal when they register with this email."}</p>
          </div>
        )}
      </div>

      {/* 4. Venue */}
      <div ref={(el) => { stepRefs.current.venue = el; }} className={stepClass("venue")}>
        <StepHeading icon={MapPin} title="Where will it be?" />
        <Field icon={MapPin} label="Venue">
          <select name="venueId" value={venueId} onChange={(e) => setVenueId(e.target.value)} className="input">
            <option value="">Not decided yet</option>
            {venues.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}{o.capacity ? ` (up to ${o.capacity})` : ""}{family && !o.active ? " (your venue)" : ""}
              </option>
            ))}
            <option value={NEW_VENUE}>{family ? "My venue isn’t listed…" : "+ Add a new venue…"}</option>
          </select>
        </Field>
        {venue && !venueEditable && (
          <p className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <MapPin className="h-4 w-4 text-gray-400" />{venue.address ?? "Address on file with SFSI"}
          </p>
        )}
        {venueEditable && (
          // Keyed by venue so switching venues re-fills the fields from that venue's record.
          <div key={venueId} className="grid gap-4 rounded-2xl border border-gray-200 p-5 sm:grid-cols-2">
            {(isNewVenue || (family && venue && !venue.active)) && (
              <label className="label sm:col-span-2">
                Venue name
                <input name="venueName" required defaultValue={isNewVenue ? "" : venue?.name} className="input" placeholder="e.g. Young Israel of Hollywood social hall" />
              </label>
            )}
            <label className="label sm:col-span-2">Address<input name="venueAddress" defaultValue={venue?.address ?? ""} className="input" placeholder="Street, city, ZIP" /></label>
            <label className="label">Venue contact<input name="venueContactName" defaultValue={venue?.contactName ?? ""} className="input" placeholder="Banquet manager / office" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">Phone<input name="venueContactPhone" type="tel" defaultValue={venue?.contactPhone ?? ""} className="input" /></label>
              <label className="label">Email<input name="venueContactEmail" type="email" defaultValue={venue?.contactEmail ?? ""} className="input" /></label>
            </div>
            {!family && (
              <p className="hint sm:col-span-2">
                {isNewVenue ? "New venues are saved privately for operators; list one publicly from Venues." : "Changes here update this venue’s record for all events."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 5. Times */}
      <div ref={(el) => { stepRefs.current.times = el; }} className={stepClass("times")}>
        <StepHeading icon={Clock} title="What’s the schedule?" hint="Approximate times are fine." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field icon={Clock} label={labels.cocktails}><input name="cocktailsTime" type="time" defaultValue={v("cocktailsTime")} className="input" /></Field>
          <Field icon={Clock} label={labels.ceremony}><input name="ceremonyTime" type="time" defaultValue={v("ceremonyTime")} className="input" /></Field>
          <Field icon={Clock} label="Dessert"><input name="dessertTime" type="time" defaultValue={v("dessertTime")} className="input" /></Field>
        </div>
        <details className="group/d rounded-2xl border border-gray-200 px-5 py-4" open={Boolean(v("venueAccessTime") || v("venueOutTime"))}>
          <summary className="cursor-pointer list-none text-sm font-medium text-brand-700">
            <span className="group-open/d:hidden">+ Venue sets a setup time or must-be-out time</span>
            <span className="hidden text-gray-800 group-open/d:inline">Venue access</span>
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="label">Setup can begin at<input name="venueAccessTime" type="time" defaultValue={v("venueAccessTime")} className="input" /></label>
            <label className="label">Everything out by<input name="venueOutTime" type="time" defaultValue={v("venueOutTime")} className="input" /></label>
          </div>
        </details>
      </div>

      {/* 6. Extras */}
      <div ref={(el) => { stepRefs.current.extras = el; }} className={stepClass("extras")}>
        <StepHeading icon={NotebookPen} title="A few more details" hint="All optional." />
        {family && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Package
              <select name="packageId" defaultValue={v("packageId")} className="input">
                <option value="">À la carte / not sure</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="label">
              Total budget
              <input name="budget" inputMode="decimal" placeholder="$" defaultValue={event?.budget != null ? (event.budget / 100).toFixed(2) : ""} className="input" />
            </label>
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 px-5 py-4 text-sm font-medium">
          <input type="checkbox" checked={hasPlanner} onChange={(e) => setHasPlanner(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          {family ? "We’ve hired a party planner" : "The family has a party planner"}
        </label>
        <div className={hasPlanner ? "grid gap-3 rounded-2xl border border-gray-200 p-5 sm:grid-cols-2" : "hidden"}>
          {/* Cleared when unchecked so a removed planner isn't saved. */}
          <label className="label">Name<input name="plannerName" defaultValue={v("plannerName")} disabled={!hasPlanner} className="input" /></label>
          <label className="label">Company<input name="plannerCompany" defaultValue={v("plannerCompany")} disabled={!hasPlanner} className="input" /></label>
          <label className="label">Phone<input name="plannerPhone" type="tel" defaultValue={v("plannerPhone")} disabled={!hasPlanner} className="input" /></label>
          <label className="label">Email<input name="plannerEmail" type="email" defaultValue={v("plannerEmail")} disabled={!hasPlanner} className="input" /></label>
        </div>
        <label className="label">
          {family ? "Anything else we should know?" : "Notes"}
          <textarea name="notes" rows={3} defaultValue={v("notes")} className="input" placeholder={family ? "Minhagim, accessibility needs, subsidy request…" : undefined} />
        </label>
      </div>

      {/* 7. Review */}
      <div ref={(el) => { stepRefs.current.review = el; }} className={stepClass("review")}>
        <StepHeading icon={Check} title="Review" hint="Check everything, then save. You can jump back to any step." />
        <label className="label">
          Event name
          <input
            name="title"
            defaultValue={v("title")}
            className="input"
            placeholder={suggestTitle({ type, groomName: values.groomName, brideName: values.brideName, contactName: values.contactName })}
          />
          <span className="hint">Leave blank to use the suggestion.</span>
        </label>
        {current.key === "review" && (
          <Summary values={values} venues={venues} packages={packages} family={family} onEdit={(key) => setIndex(steps.findIndex((s) => s.key === key))} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <button type="button" onClick={() => setIndex((i) => Math.max(i - 1, 0))} className={`btn-ghost ${index === 0 ? "invisible" : ""}`}>
          <ChevronLeft className="h-4 w-4" />Back
        </button>
        <div className="flex gap-2">
          {editing && !isLast && <SubmitButton className="btn-ghost">{submitLabel}</SubmitButton>}
          {isLast ? (
            <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
          ) : (
            <button type="button" onClick={() => goTo(index + 1)} disabled={current.key === "type" && !type} className="btn-primary">
              Next<ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function StepHeading({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold/15 text-navy">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div>
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        {hint && <p className="text-sm text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <label className="label">
      <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-gray-400" />{label}</span>
      {children}
    </label>
  );
}

/** Read-only summary of the intake, used by the review step and when the record is locked. */
function Summary({
  values,
  venues,
  packages,
  family,
  onEdit,
}: {
  values: Record<string, string>;
  venues: VenueOption[];
  packages: PackageOption[];
  family: boolean;
  onEdit?: (step: StepKey) => void;
}) {
  const g = (k: string) => values[k]?.trim() ?? "";
  const type = TYPES.find((t) => t.value === g("type"));
  const labels = TIME_LABELS[g("type")] ?? { cocktails: "Reception", ceremony: "Ceremony" };
  const venue = venues.find((x) => x.id === g("venueId"));
  const venueName = g("venueId") === NEW_VENUE ? g("venueName") : venue?.name;
  const venueAddress = g("venueAddress") || venue?.address;
  const pkg = packages.find((p) => p.id === g("packageId"));
  const join = (...parts: string[]) => parts.filter(Boolean).join(" · ");
  const time = (k: string) => (g(k) ? formatTime(g(k)) : "");

  const sections: { key: StepKey; icon: LucideIcon; title: string; rows: [string, string | undefined][] }[] = [
    {
      key: "when",
      icon: type?.icon ?? Sparkles,
      title: type?.label ?? "Simchah",
      rows: [
        ["Date", g("eventDate") ? formatDate(g("eventDate")) : "Not set yet"],
        ["Guests", g("guestCount")],
        ...(family ? ([["Package", pkg?.name], ["Budget", g("budget") ? `$${g("budget")}` : ""]] as [string, string][]) : []),
      ],
    },
    {
      key: "people",
      icon: Users,
      title: g("type") === "wedding" ? "Chosson & kallah" : "Family",
      rows: [
        ...(g("type") === "wedding"
          ? ([
              ["Chosson", join(g("groomName"), g("groomParents") && `son of ${g("groomParents")}`)],
              ["Kallah", join(g("brideName"), g("brideParents") && `daughter of ${g("brideParents")}`)],
              ["Chosson’s side", join(g("groomContactName"), g("groomContactPhone"), g("groomContactEmail"))],
              ["Kallah’s side", join(g("brideContactName"), g("brideContactPhone"), g("brideContactEmail"))],
            ] as [string, string][])
          : []),
        ...(!family ? ([["Family contact", join(g("contactName"), g("contactPhone"), g("contactEmail"))]] as [string, string][]) : []),
      ],
    },
    {
      key: "venue",
      icon: MapPin,
      title: "Venue",
      rows: [
        ["Venue", venueName || "Not decided yet"],
        ["Address", venueAddress ?? ""],
        ["Venue contact", join(g("venueContactName") || (venue?.contactName ?? ""), g("venueContactPhone") || (venue?.contactPhone ?? ""), g("venueContactEmail") || (venue?.contactEmail ?? ""))],
      ],
    },
    {
      key: "times",
      icon: Clock,
      title: "Times",
      rows: [
        ["Setup from", time("venueAccessTime")],
        [labels.cocktails, time("cocktailsTime")],
        [labels.ceremony, time("ceremonyTime")],
        ["Dessert", time("dessertTime")],
        ["Out by", time("venueOutTime")],
      ],
    },
    {
      key: "extras",
      icon: NotebookPen,
      title: "Extras",
      rows: [
        ["Party planner", join(g("plannerName"), g("plannerCompany"), g("plannerPhone"), g("plannerEmail"))],
        ["Notes", g("notes")],
      ],
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sections.map((s) => {
        const rows = s.rows.filter(([, val]) => val);
        if (rows.length === 0 && s.key !== "venue" && s.key !== "when") return null;
        return (
          <div key={s.key} className="rounded-2xl border border-gray-200 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-navy"><s.icon className="h-3.5 w-3.5" /></span>
                {s.title}
              </div>
              {onEdit && (
                <button type="button" onClick={() => onEdit(s.key)} className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                  <Pencil className="h-3 w-3" />Edit
                </button>
              )}
            </div>
            <dl className="grid gap-1 text-sm">
              {rows.map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-right font-medium text-gray-800">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
