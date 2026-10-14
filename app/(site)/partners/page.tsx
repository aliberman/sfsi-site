import InquiryForm from "@/components/InquiryForm";

export const metadata = { title: "Become a Partner" };

export default function PartnersPage() {
  return (
    <section className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold">Become a partner</h1>
      <p className="mt-4 text-lg text-gray-700">
        We work with venues, caterers, musicians, photographers, florists, and rental companies who share our commitment
        to elegant, affordable, halachically sound simchos. Partners receive steady, well-coordinated bookings through
        our platform.
      </p>
      <div className="card mt-10">
        <InquiryForm
          kind="partner"
          subjectLabel="Partner type"
          subjectOptions={["Venue", "Caterer", "Music / DJ", "Photography / Video", "Florist / Décor", "Rentals", "Other"]}
          messageLabel="Business name, website, hechsher (if applicable), and service area"
          submitLabel="Submit application"
        />
      </div>
    </section>
  );
}
