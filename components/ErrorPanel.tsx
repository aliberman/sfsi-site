"use client";

export default function ErrorPanel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Server action errors thrown with a user-facing message surface here.
  const message = process.env.NODE_ENV === "production" && error.digest ? "Something went wrong. Please try again." : error.message;
  return (
    <div className="card mx-auto max-w-lg text-center">
      <h2 className="text-lg font-semibold">That didn’t work</h2>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      <button onClick={reset} className="btn-primary mt-4">Go back</button>
    </div>
  );
}
