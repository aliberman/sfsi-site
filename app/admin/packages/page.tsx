import { asc } from "drizzle-orm";
import { savePackage } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, Pill } from "@/components/ui";
import { db, schema } from "@/lib/db";
import { centsToInput, money } from "@/lib/format";

export const metadata = { title: "Packages" };

type Pkg = typeof schema.packages.$inferSelect;

function PackageForm({ p }: { p?: Pkg }) {
  return (
    <form action={savePackage} className="grid gap-3 sm:grid-cols-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <label className="label sm:col-span-2">Name<input name="name" required defaultValue={p?.name} className="input" /></label>
      <label className="label sm:col-span-2">Tagline<input name="tagline" defaultValue={p?.tagline ?? ""} className="input" /></label>
      <label className="label">From $ <span className="hint">blank = on request</span><input name="startingPrice" inputMode="decimal" defaultValue={centsToInput(p?.startingPrice)} className="input" /></label>
      <label className="label">Order<input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className="input" /></label>
      <label className="label sm:col-span-6">Included features <span className="hint">one per line</span><textarea name="features" rows={5} defaultValue={p?.features.join("\n")} className="input" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Published</label>
      <SubmitButton className="btn-primary w-fit">{p ? "Save" : "Add package"}</SubmitButton>
    </form>
  );
}

export default async function PackagesAdminPage() {
  const packages = await db.query.packages.findMany({ orderBy: [asc(schema.packages.sortOrder)] });
  return (
    <div className="grid gap-6">
      <PageHeader title="Packages" subtitle="Shown on the home and Packages pages. A package’s starting price becomes the first line of a quote." />
      <div className="card p-0">
        {packages.map((p) => (
          <details key={p.id} className="border-b px-5 py-3 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="flex gap-2">{p.startingPrice != null ? `from ${money(p.startingPrice)}` : "on request"}{!p.active && <Pill>hidden</Pill>}</span>
            </summary>
            <div className="pt-4"><PackageForm p={p} /></div>
          </details>
        ))}
      </div>
      <div className="card"><h2 className="section-title mb-4">New package</h2><PackageForm /></div>
    </div>
  );
}
