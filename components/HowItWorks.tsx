import Link from "next/link";
import { CalendarHeart, ClipboardList, FileText, PartyPopper, Wallet } from "lucide-react";

const STEPS = [
  { icon: CalendarHeart, title: "Create your account", body: "Tell us the simchah, date, guest count, and the venue or package you have in mind." },
  { icon: ClipboardList, title: "Request what you need", body: "Pick services and rentals from our catalog and request catering quotes—meat, dairy, buffet or plated." },
  { icon: FileText, title: "Review your quote", body: "Your coordinator sends an itemized quote, including any community subsidy. Accept it online." },
  { icon: Wallet, title: "Pay over time", body: "A clear deposit and installment schedule, paid online or by check or Zelle." },
  { icon: PartyPopper, title: "We handle the rest", body: "Our team books staff, equipment, and vendors, and shares your day-of timeline." },
];

export default function HowItWorks() {
  return (
    <section className="bg-gray-50">
      <div className="container py-16">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">How planning works</h2>
        <p className="mt-2 max-w-2xl text-gray-600">One family portal, from first idea to last dance.</p>
        <ol className="mt-10 grid gap-6 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-5">
              <div className="flex items-center gap-2 text-brand-700">
                <s.icon className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Step {i + 1}</span>
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{s.body}</p>
            </li>
          ))}
        </ol>
        <Link href="/register" className="btn-primary mt-8">Create your family portal</Link>
      </div>
    </section>
  );
}
