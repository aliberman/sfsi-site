"use client";

import { useRef } from "react";

/** A server-action form that clears its fields after a successful submit. */
export default function ResetForm({
  action,
  children,
  ...rest
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "action"> & { action: (fd: FormData) => Promise<void> }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      {...rest}
      ref={ref}
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
      }}
    >
      {children}
    </form>
  );
}
