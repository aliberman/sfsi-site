import type { Event } from "@/lib/db/schema";
import { centsToInput, EVENT_TYPE_LABELS } from "@/lib/format";
import { Options } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

type Ref = { id: string; name: string; capacity?: number | null; neighborhood?: string | null };

export default function EventForm({
  action,
  event,
  venues,
  packages,
  defaultPackageId,
  submitLabel,
  disabled,
}: {
  action: (fd: FormData) => Promise<void>;
  event?: Event;
  venues: Ref[];
  packages: Ref[];
  defaultPackageId?: string;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <form action={action} className="grid gap-5">
      {event && <input type="hidden" name="eventId" value={event.id} />}
      <fieldset disabled={disabled} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            Type of simchah
            <select name="type" required defaultValue={event?.type ?? "wedding"} className="input">
              <Options map={EVENT_TYPE_LABELS} />
            </select>
          </label>
          <label className="label">
            Event name <span className="hint">e.g. “Cohen–Levy Wedding”</span>
            <input name="title" defaultValue={event?.title} className="input" maxLength={200} />
          </label>
          <label className="label">Date<input name="eventDate" type="date" defaultValue={event?.eventDate ?? ""} className="input" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="label">Start<input name="startTime" type="time" defaultValue={event?.startTime ?? ""} className="input" /></label>
            <label className="label">End<input name="endTime" type="time" defaultValue={event?.endTime ?? ""} className="input" /></label>
          </div>
          <label className="label">Estimated guests<input name="guestCount" type="number" min={1} max={5000} defaultValue={event?.guestCount ?? ""} className="input" /></label>
          <label className="label">
            Total budget <span className="hint">optional, helps us tailor the quote</span>
            <input name="budget" inputMode="decimal" placeholder="$" defaultValue={centsToInput(event?.budget)} className="input" />
          </label>
          <label className="label">
            Venue
            <select name="venueId" defaultValue={event?.venueId ?? ""} className="input">
              <option value="">Not sure yet / my own venue</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}{v.neighborhood ? ` — ${v.neighborhood}` : ""}{v.capacity ? ` (up to ${v.capacity})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Package
            <select name="packageId" defaultValue={event?.packageId ?? defaultPackageId ?? ""} className="input">
              <option value="">À la carte / not sure</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        <label className="label">
          Venue notes <span className="hint">your own venue’s address, or preferences</span>
          <input name="venueNotes" defaultValue={event?.venueNotes ?? ""} className="input" />
        </label>
        <label className="label">
          Anything else we should know?
          <textarea name="notes" rows={4} defaultValue={event?.notes ?? ""} className="input" placeholder="Minhagim, accessibility needs, subsidy request, special requests…" />
        </label>
        {!disabled && <SubmitButton className="btn-primary w-fit">{submitLabel}</SubmitButton>}
      </fieldset>
    </form>
  );
}
