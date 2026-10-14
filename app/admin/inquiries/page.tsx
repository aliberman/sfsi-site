import { asc, desc } from "drizzle-orm";
import { setInquiryHandled } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { EmptyState, PageHeader, Pill } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Inquiries" };

const KIND_LABELS: Record<string, string> = { plan: "Planning", partner: "Partner", donate: "Donation", general: "General" };

export default async function InquiriesPage() {
  const rows = await db.query.inquiries.findMany({ orderBy: [asc(schema.inquiries.handled), desc(schema.inquiries.createdAt)], limit: 200 });
  return (
    <div className="grid gap-6">
      <PageHeader title="Inquiries" subtitle="Website forms: planning questions, partner applications, donation pledges." />
      {rows.length === 0 ? <EmptyState>No inquiries yet.</EmptyState> : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={r.id} className={`card p-5 text-sm ${r.handled ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2"><Pill tone={r.kind === "partner" ? "blue" : r.kind === "donate" ? "green" : "amber"}>{KIND_LABELS[r.kind]}</Pill><span className="font-medium">{r.name}</span></div>
                  <div className="mt-1 text-gray-600"><a className="link" href={`mailto:${r.email}`}>{r.email}</a>{r.phone && ` · ${r.phone}`} · {formatDateTime(r.createdAt)}</div>
                </div>
                <form action={setInquiryHandled}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="handled" value={r.handled ? "false" : "true"} />
                  <SubmitButton className="btn-ghost btn-sm">{r.handled ? "Reopen" : "Mark handled"}</SubmitButton>
                </form>
              </div>
              {(r.subject || r.guestCount) && <div className="mt-2 text-gray-700">{r.subject}{r.guestCount ? ` · ${r.guestCount} guests` : ""}</div>}
              {r.message && <p className="mt-2 whitespace-pre-line text-gray-800">{r.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
