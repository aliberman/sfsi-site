"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { login, register } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFormState(login, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="label">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
      <label className="label">Password<input name="password" type="password" required autoComplete="current-password" className="input" /></label>
      {state?.error && <p className="text-sm text-rose-700">{state.error}</p>}
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      <p className="text-sm text-gray-600">
        New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link">Create an account</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useFormState(register, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="label">Full name<input name="name" required autoComplete="name" className="input" /></label>
      <label className="label">Email<input name="email" type="email" required autoComplete="email" className="input" /></label>
      <label className="label">Phone <span className="hint">optional — for your coordinator</span><input name="phone" type="tel" autoComplete="tel" className="input" /></label>
      <label className="label">Password <span className="hint">at least 8 characters</span><input name="password" type="password" minLength={8} required autoComplete="new-password" className="input" /></label>
      {state?.error && <p className="text-sm text-rose-700">{state.error}</p>}
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
      <p className="text-sm text-gray-600">
        Already have an account? <Link href="/login" className="link">Sign in</Link>
      </p>
    </form>
  );
}
