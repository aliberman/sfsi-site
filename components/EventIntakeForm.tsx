"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";

// The event intake form, used by operators in the back office and by families in the portal.

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

export const INTAKE_TYPE_OPTIONS = [
  { value: "wedding", label: "Wedding" },
  { value: "bar_mitzvah", label: "Bar Mitzvah" },
  { value: "bris", label: "Bris Milah" },
];

const TIME_LABELS: Record<string, { cocktails: string; ceremony: string }> = {
  wedding: { cocktails: "Kabbalas Panim / cocktails", ceremony: "Chuppah" },
  bar_mitzvah: { cocktails: "Reception / cocktails", ceremony: "Ceremony / speeches" },
  bris: { cocktails: "Reception", ceremony: "Bris" },
};

const NEW_VENUE = "__new";

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
  const [type, setType] = useState(event?.type ?? "wedding");
  const [venueId, setVenueId] = useState(event?.venueId ?? "");
  const venue = venues.find((v) => v.id === venueId);
  const isNewVenue = venueId === NEW_VENUE;
  // Families see a listed venue's address but can only edit a venue they added themselves.
  const venueEditable = isNewVenue || (venue && (!family || !venue.active));
  const labels = TIME_LABELS[type] ?? { cocktails: "Reception / cocktails", ceremony: "Ceremony" };
  const typeOptions = INTAKE_TYPE_OPTIONS.some((t) => t.value === type)
    ? INTAKE_TYPE_OPTIONS
    : [...INTAKE_TYPE_OPTIONS, { value: type, label: "Other" }];
  const v = (key: keyof IntakeValues) => (event?.[key] as string | number | null | undefined) ?? "";

  return (
    <form action={action} className="grid gap-6">
      {event?.id && <input type="hidden" name="eventId" value={event.id} />}
      <fieldset disabled={readOnly} className="grid gap-6 disabled:opacity-90">
        <fieldset className="grid gap-4 sm:grid-cols-4">
          <legend className="section-title mb-3">Event</legend>
          <label className="label sm:col-span-2">
            Title
            <input name="title" required={!family} defaultValue={v("title")} className="input" placeholder="Cohen–Levy Wedding" />
          </label>
          <label className="label">
            Type
            <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="input">
              {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="label">
            Date
            <input name="eventDate" type="date" required={!family} defaultValue={v("eventDate")} className="input" />
          </label>
          <label className="label">
            Expected guests
            <input name="guestCount" type="number" min={0} max={5000} defaultValue={v("guestCount")} className="input" />
          </label>
          {family && (
            <>
              <label className="label">
                Package
                <select name="packageId" defaultValue={v("packageId")} className="input">
                  <option value="">À la carte / not sure</option>
                  {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="label">
                Total budget <span className="hint">optional</span>
                <input name="budget" inputMode="decimal" placeholder="$" defaultValue={event?.budget != null ? (event.budget / 100).toFixed(2) : ""} className="input" />
              </label>
            </>
          )}
        </fieldset>

        {type === "wedding" && (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="section-title mb-3">Chosson & kallah</legend>
            <label className="label">Groom’s name<input name="groomName" defaultValue={v("groomName")} className="input" /></label>
            <label className="label">Bride’s name<input name="brideName" defaultValue={v("brideName")} className="input" /></label>
            <label className="label">Groom’s parents<input name="groomParents" defaultValue={v("groomParents")} className="input" placeholder="Mr. & Mrs. Yosef Cohen" /></label>
            <label className="label">Bride’s parents<input name="brideParents" defaultValue={v("brideParents")} className="input" placeholder="Rabbi & Mrs. Dovid Levy" /></label>
            {(["groom", "bride"] as const).map((side) => (
              <div key={side} className="grid gap-3 rounded-xl border p-4">
                <div className="text-sm font-medium text-gray-700">{side === "groom" ? "Groom’s side" : "Bride’s side"}: responsible party</div>
                <label className="label">Name<input name={`${side}ContactName`} defaultValue={v(`${side}ContactName`)} className="input" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="label">Phone<input name={`${side}ContactPhone`} type="tel" defaultValue={v(`${side}ContactPhone`)} className="input" /></label>
                  <label className="label">Email<input name={`${side}ContactEmail`} type="email" defaultValue={v(`${side}ContactEmail`)} className="input" /></label>
                </div>
              </div>
            ))}
          </fieldset>
        )}

        {!family && (
          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="section-title mb-3">Primary family contact</legend>
            <label className="label">Name<input name="contactName" defaultValue={v("contactName")} className="input" /></label>
            <label className="label">
              Email <span className="hint">{hasPortalAccount ? "linked to their portal account" : "links the event when they register"}</span>
              <input name="contactEmail" type="email" defaultValue={v("contactEmail")} className="input" />
            </label>
            <label className="label">Phone<input name="contactPhone" type="tel" defaultValue={v("contactPhone")} className="input" /></label>
          </fieldset>
        )}

        <fieldset className="grid gap-4 sm:grid-cols-4">
          <legend className="section-title mb-1">Party planner <span className="text-sm font-normal text-gray-500">if you’ve hired one</span></legend>
          <label className="label">Name<input name="plannerName" defaultValue={v("plannerName")} className="input" /></label>
          <label className="label">Company<input name="plannerCompany" defaultValue={v("plannerCompany")} className="input" /></label>
          <label className="label">Phone<input name="plannerPhone" type="tel" defaultValue={v("plannerPhone")} className="input" /></label>
          <label className="label">Email<input name="plannerEmail" type="email" defaultValue={v("plannerEmail")} className="input" /></label>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-4">
          <legend className="section-title mb-3">Venue</legend>
          <label className="label sm:col-span-2">
            Venue
            <select name="venueId" value={venueId} onChange={(e) => setVenueId(e.target.value)} className="input">
              <option value="">To be decided</option>
              {venues.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}{o.capacity ? ` (up to ${o.capacity})` : ""}{family && !o.active ? " (your venue)" : ""}
                </option>
              ))}
              <option value={NEW_VENUE}>{family ? "My venue isn’t listed…" : "+ Add a new venue…"}</option>
            </select>
          </label>
          {(isNewVenue || (family && venue && !venue.active)) && (
            <label className="label sm:col-span-2">
              Venue name
              <input name="venueName" required defaultValue={isNewVenue ? "" : venue?.name} className="input" placeholder="e.g. Young Israel of Hollywood social hall" />
            </label>
          )}
          {venue && !venueEditable && (
            <p className="text-sm text-gray-600 sm:col-span-2 sm:self-end sm:pb-2">{venue.address ?? "Address on file with SFSI"}</p>
          )}
          {venueEditable && (
            // Keyed by venue so switching venues re-fills the fields from that venue's record.
            <div key={venueId} className="grid gap-4 sm:col-span-4 sm:grid-cols-4">
              <label className="label sm:col-span-4">
                Address
                <input name="venueAddress" defaultValue={venue?.address ?? ""} className="input" placeholder="Street, city, ZIP" />
              </label>
              <label className="label">Venue contact<input name="venueContactName" defaultValue={venue?.contactName ?? ""} className="input" placeholder="Banquet manager / office" /></label>
              <label className="label">Contact phone<input name="venueContactPhone" type="tel" defaultValue={venue?.contactPhone ?? ""} className="input" /></label>
              <label className="label sm:col-span-2">Contact email<input name="venueContactEmail" type="email" defaultValue={venue?.contactEmail ?? ""} className="input" /></label>
              {!family && (
                <p className="hint sm:col-span-4">
                  {isNewVenue ? "New venues are saved privately for operators; list one publicly from Venues." : "Changes here update this venue’s record for all events."}
                </p>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-5">
          <legend className="section-title mb-3">Times</legend>
          <label className="label">Venue access / setup<input name="venueAccessTime" type="time" defaultValue={v("venueAccessTime")} className="input" /></label>
          <label className="label">{labels.cocktails}<input name="cocktailsTime" type="time" defaultValue={v("cocktailsTime")} className="input" /></label>
          <label className="label">{labels.ceremony}<input name="ceremonyTime" type="time" defaultValue={v("ceremonyTime")} className="input" /></label>
          <label className="label">Dessert<input name="dessertTime" type="time" defaultValue={v("dessertTime")} className="input" /></label>
          <label className="label">Must be out by<input name="venueOutTime" type="time" defaultValue={v("venueOutTime")} className="input" /></label>
          <p className="hint sm:col-span-5">Leave setup and out times blank if the venue doesn’t set them.</p>
        </fieldset>

        <label className="label">
          {family ? "Anything else we should know?" : "Notes"}
          <textarea name="notes" rows={3} defaultValue={v("notes")} className="input" placeholder={family ? "Minhagim, accessibility needs, subsidy request…" : undefined} />
        </label>

        {!readOnly && <SubmitButton className="btn-primary w-fit">{submitLabel}</SubmitButton>}
      </fieldset>
    </form>
  );
}
