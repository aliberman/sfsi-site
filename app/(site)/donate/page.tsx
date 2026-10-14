import InquiryForm from "@/components/InquiryForm";

export const metadata = { title: "Donate" };

export default function DonatePage() {
  const donateUrl = process.env.NEXT_PUBLIC_DONATE_URL;
  return (
    <section className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold">Support a simchah</h1>
      <p className="mt-4 text-lg text-gray-700">
        Monthly donors make it possible for every family to celebrate at home with dignity. Your gift funds direct
        subsidies on SFSI packages for families who need them.
      </p>
      {donateUrl && (
        <a href={donateUrl} className="btn-gold mt-6 px-6 py-3" target="_blank" rel="noreferrer">Donate now</a>
      )}
      <div className="card mt-10">
        <h2 className="text-xl font-semibold">{donateUrl ? "Prefer to talk first?" : "Pledge monthly support"}</h2>
        <p className="mt-1 mb-5 text-sm text-gray-600">Leave your details and we’ll follow up with giving options, including dedications.</p>
        <InquiryForm
          kind="donate"
          subjectLabel="Monthly pledge"
          subjectOptions={["$18 / month", "$36 / month", "$100 / month", "$180 / month", "Other amount", "One-time gift"]}
          messageLabel="Dedication or note (optional)"
          submitLabel="Send pledge"
        />
      </div>
    </section>
  );
}
