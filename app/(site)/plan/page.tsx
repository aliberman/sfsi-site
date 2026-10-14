import Link from "next/link";
import InquiryForm from "@/components/InquiryForm";

export const metadata = { title: "Plan Your Simchah" };

export default function PlanPage() {
  return (
    <section className="container py-16">
      <h1 className="font-display text-4xl font-semibold">Plan your simchah</h1>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="card border-brand-200 bg-brand-50/50">
          <h2 className="text-xl font-semibold">Plan online in your family portal</h2>
          <p className="mt-2 text-gray-700">
            Create a free account to build your event, request services and equipment, get catering quotes, accept your
            quote, and manage your payment plan—all in one place.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>Itemized quotes from your coordinator</li>
            <li>Deposit + installment payment plans</li>
            <li>Messages, timeline, and status updates</li>
          </ul>
          <div className="mt-6 flex gap-3">
            <Link href="/register" className="btn-primary">Create an account</Link>
            <Link href="/login" className="btn-ghost">Sign in</Link>
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold">Just have a question?</h2>
          <p className="mt-1 mb-5 text-sm text-gray-600">Send a quick note and a coordinator will reach out.</p>
          <InquiryForm
            kind="plan"
            subjectLabel="Simchah type"
            subjectOptions={["Wedding", "Bar Mitzvah", "Bat Mitzvah", "Bris", "Kiddush / Sheva Brachos", "Other"]}
            showGuestCount
            messageLabel="Tell us about your simchah"
            submitLabel="Send inquiry"
          />
        </div>
      </div>
    </section>
  );
}
