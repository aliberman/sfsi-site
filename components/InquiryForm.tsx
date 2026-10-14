"use client";

import { useFormState } from "react-dom";
import { submitInquiry } from "@/app/actions/public";
import { SubmitButton } from "@/components/SubmitButton";

type Props = {
  kind: "plan" | "partner" | "donate" | "general";
  subjectLabel?: string;
  subjectOptions?: string[];
  showGuestCount?: boolean;
  messageLabel?: string;
  submitLabel?: string;
};

export default function InquiryForm({ kind, subjectLabel, subjectOptions, showGuestCount, messageLabel = "Message", submitLabel = "Send" }: Props) {
  const [state, action] = useFormState(submitInquiry, undefined);
  if (state?.ok) {
    return <div className="rounded-xl bg-brand-50 p-5 text-brand-800">{state.ok}</div>;
  }
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">Name<input name="name" required className="input" autoComplete="name" /></label>
        <label className="label">Email<input name="email" type="email" required className="input" autoComplete="email" /></label>
        <label className="label">Phone <span className="hint">optional</span><input name="phone" type="tel" className="input" autoComplete="tel" /></label>
        {subjectLabel && (
          <label className="label">
            {subjectLabel}
            {subjectOptions ? (
              <select name="subject" className="input">
                {subjectOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input name="subject" className="input" />
            )}
          </label>
        )}
        {showGuestCount && (
          <label className="label">Estimated guests<input name="guestCount" type="number" min={0} className="input" /></label>
        )}
      </div>
      <label className="label">{messageLabel}<textarea name="message" rows={4} className="input" /></label>
      {state?.error && <p className="text-sm text-rose-700">{state.error}</p>}
      <SubmitButton className="btn-primary w-fit" pendingLabel="Sending…">{submitLabel}</SubmitButton>
    </form>
  );
}
