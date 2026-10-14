import { asc } from "drizzle-orm";
import { saveStaffMember } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { Options, PageHeader, Pill } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { centsToInput, money, STAFF_ROLE_LABELS } from "@/lib/format";

export const metadata = { title: "Staff" };

type Member = typeof schema.staffMembers.$inferSelect;

function MemberForm({ m }: { m?: Member }) {
  return (
    <form action={saveStaffMember} className="grid gap-3 sm:grid-cols-6">
      {m && <input type="hidden" name="id" value={m.id} />}
      <label className="label sm:col-span-2">Name<input name="name" required defaultValue={m?.name} className="input" /></label>
      <label className="label">Primary role<select name="primaryRole" defaultValue={m?.primaryRole ?? "server"} className="input"><Options map={STAFF_ROLE_LABELS} /></select></label>
      <label className="label">Phone<input name="phone" defaultValue={m?.phone ?? ""} className="input" /></label>
      <label className="label">Email<input name="email" type="email" defaultValue={m?.email ?? ""} className="input" /></label>
      <label className="label">Rate $/hr<input name="hourlyRate" inputMode="decimal" defaultValue={centsToInput(m?.hourlyRate)} className="input" /></label>
      <label className="label sm:col-span-4">Notes<input name="notes" defaultValue={m?.notes ?? ""} className="input" placeholder="Certifications, availability, languages…" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={m?.active ?? true} /> Active</label>
      <SubmitButton className="btn-primary w-fit">{m ? "Save" : "Add person"}</SubmitButton>
    </form>
  );
}

export default async function StaffPage() {
  const members = await db.query.staffMembers.findMany({
    orderBy: [asc(schema.staffMembers.primaryRole), asc(schema.staffMembers.name)],
  });
  return (
    <div className="grid gap-6">
      <PageHeader title="Staff roster" subtitle="Coordinators, servers, mashgichim, crew, and talent available for assignment." />
      <div className="card"><h2 className="section-title mb-4">Add to roster</h2><MemberForm /></div>
      <div className="card p-0">
        {members.map((m) => (
          <details key={m.id} className="border-b px-5 py-3 last:border-0">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
              <span><span className="font-medium">{m.name}</span> <span className="text-gray-500">· {STAFF_ROLE_LABELS[m.primaryRole]}</span></span>
              <span className="flex items-center gap-3 text-gray-600">{m.phone}{m.hourlyRate != null && <span>{money(m.hourlyRate)}/hr</span>}{!m.active && <Pill>inactive</Pill>}</span>
            </summary>
            <div className="pt-4"><MemberForm m={m} /></div>
          </details>
        ))}
      </div>
    </div>
  );
}
