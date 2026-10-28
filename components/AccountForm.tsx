"use client";

import { useFormState } from "react-dom";
import { updateAccount } from "@/app/actions/portal";
import { SubmitButton } from "@/components/SubmitButton";

export default function AccountForm({ name, phone, hasPassword = true }: { name: string; phone: string | null; hasPassword?: boolean }) {
  const [state, action] = useFormState(updateAccount, undefined);
  return (
    <form action={action} className="grid gap-4">
      <label className="label">Name<input name="name" defaultValue={name} required className="input" /></label>
      <label className="label">Phone<input name="phone" type="tel" defaultValue={phone ?? ""} className="input" /></label>
      <fieldset className="grid gap-4 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">{hasPassword ? "Change password" : "Add a password"}</legend>
        {hasPassword ? (
          <label className="label">Current password<input name="currentPassword" type="password" autoComplete="current-password" className="input" /></label>
        ) : (
          <p className="text-sm text-gray-600">You sign in with Google or Microsoft. Add a password to also sign in with your email.</p>
        )}
        <label className="label">New password<input name="newPassword" type="password" minLength={8} autoComplete="new-password" className="input" /></label>
      </fieldset>
      {state?.error && <p className="text-sm text-rose-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand-700">{state.ok}</p>}
      <SubmitButton className="btn-primary w-fit">Save changes</SubmitButton>
    </form>
  );
}
