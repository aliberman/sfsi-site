import InquiryForm from "@/components/InquiryForm";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold">Contact us</h1>
      <p className="mt-4 text-gray-700">Questions about SFSI, partnerships, or spreading the word? We’d love to hear from you.</p>
      <div className="card mt-8">
        <InquiryForm kind="general" subjectLabel="Subject" submitLabel="Send message" />
      </div>
    </section>
  );
}
