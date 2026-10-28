import { asc } from "drizzle-orm";
import { saveVendor } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { Options, PageHeader, Pill } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { VENDOR_CATEGORY_LABELS } from "@/lib/format";
import { requireOperator } from "@/lib/auth";

export const metadata = { title: "Vendors" };

type Vendor = typeof schema.vendors.$inferSelect;

function VendorForm({ v }: { v?: Vendor }) {
  return (
    <form action={saveVendor} className="grid gap-3 sm:grid-cols-6">
      {v && <input type="hidden" name="id" value={v.id} />}
      <label className="label sm:col-span-2">Business name<input name="name" required defaultValue={v?.name} className="input" /></label>
      <label className="label">Category<select name="category" defaultValue={v?.category ?? "caterer"} className="input"><Options map={VENDOR_CATEGORY_LABELS} /></select></label>
      <label className="label">Hechsher <span className="hint">caterers</span><input name="hechsher" defaultValue={v?.hechsher ?? ""} className="input" /></label>
      <label className="label">Phone<input name="phone" defaultValue={v?.phone ?? ""} className="input" /></label>
      <label className="label">Email<input name="email" type="email" defaultValue={v?.email ?? ""} className="input" /></label>
      <label className="label sm:col-span-2">Website<input name="website" defaultValue={v?.website ?? ""} className="input" /></label>
      <label className="label sm:col-span-4">Description<input name="description" defaultValue={v?.description ?? ""} className="input" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={v?.active ?? true} /> Approved & listed publicly</label>
      <SubmitButton className="btn-primary w-fit">{v ? "Save" : "Add vendor"}</SubmitButton>
    </form>
  );
}

export default async function VendorsAdminPage() {
  await requireOperator();
  const vendors = await db.query.vendors.findMany({ orderBy: [asc(schema.vendors.category), asc(schema.vendors.name)] });
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Vendor network"
        subtitle="Approved partners appear on the public Venues & Vendors page and count toward the home page “Approved venues & vendors” number."
      />
      <div className="card"><h2 className="section-title mb-4">Add vendor</h2><VendorForm /></div>
      <div className="card p-0">
        {vendors.length === 0 && <p className="p-5 text-sm text-gray-500">No vendors yet. Approved partner applications from Inquiries can be added here.</p>}
        {vendors.map((v) => (
          <details key={v.id} className="border-b px-5 py-3 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span><span className="font-medium">{v.name}</span> <span className="text-gray-500">· {VENDOR_CATEGORY_LABELS[v.category]}</span></span>
              {v.active ? <Pill tone="green">approved</Pill> : <Pill>inactive</Pill>}
            </summary>
            <div className="pt-4"><VendorForm v={v} /></div>
          </details>
        ))}
      </div>
    </div>
  );
}
