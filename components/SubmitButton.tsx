"use client";

import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string; confirm?: string };

/** Submit button that disables itself while its form's server action runs. */
export function SubmitButton({ children, pendingLabel, confirm, className = "btn-primary", onClick, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      className={className}
      disabled={pending || rest.disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
        onClick?.(e);
      }}
    >
      {pending ? pendingLabel ?? "Saving…" : children}
    </button>
  );
}
