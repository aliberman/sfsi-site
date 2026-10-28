import { asc } from "drizzle-orm";
import { saveCatalogItem } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { Options, PageHeader, Pill } from "@/components/ui";
import { db, schema } from "@/lib/db";
import type { CatalogItem } from "@/lib/db/schema";
import { CATEGORY_LABELS, centsToInput, money, UNIT_LABELS } from "@/lib/format";
import { requireOperator } from "@/lib/auth";

export const metadata = { title: "Catalog" };

function ItemForm({ item }: { item?: CatalogItem }) {
  return (
    <form action={saveCatalogItem} className="grid gap-3 sm:grid-cols-6">
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className="label sm:col-span-2">Name<input name="name" required defaultValue={item?.name} className="input" /></label>
      <label className="label">Category<select name="category" defaultValue={item?.category ?? "equipment"} className="input"><Options map={CATEGORY_LABELS} /></select></label>
      <label className="label">Price $<input name="unitPrice" inputMode="decimal" defaultValue={centsToInput(item?.unitPrice)} className="input" /></label>
      <label className="label">Per<select name="unit" defaultValue={item?.unit ?? "each"} className="input"><Options map={UNIT_LABELS} /></select></label>
      <label className="label">Stock owned <span className="hint">blank = untracked</span><input name="inventoryQty" type="number" min={0} defaultValue={item?.inventoryQty ?? ""} className="input" /></label>
      <label className="label sm:col-span-4">Description<input name="description" defaultValue={item?.description ?? ""} className="input" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} /> Offered to families</label>
      <SubmitButton className="btn-primary w-fit">{item ? "Save" : "Add item"}</SubmitButton>
    </form>
  );
}

export default async function CatalogPage() {
  await requireOperator();
  const items = await db.query.catalogItems.findMany({ orderBy: [asc(schema.catalogItems.category), asc(schema.catalogItems.name)] });
  return (
    <div className="grid gap-6">
      <PageHeader title="Services & equipment catalog" subtitle="What families can request, and the default prices used when building quotes." />
      <div className="card"><h2 className="section-title mb-4">New item</h2><ItemForm /></div>
      <div className="card p-0">
        {items.map((i) => (
          <details key={i.id} className="border-b px-5 py-3 last:border-0">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
              <span><span className="font-medium">{i.name}</span> <span className="text-gray-500">· {CATEGORY_LABELS[i.category]}</span></span>
              <span className="flex items-center gap-3">
                {i.inventoryQty != null && <span className="text-gray-500">{i.inventoryQty} owned</span>}
                <span>{money(i.unitPrice)} {UNIT_LABELS[i.unit]}</span>
                {!i.active && <Pill>hidden</Pill>}
              </span>
            </summary>
            <div className="pt-4"><ItemForm item={i} /></div>
          </details>
        ))}
      </div>
    </div>
  );
}
