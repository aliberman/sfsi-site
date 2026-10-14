import { saveImpactSettings } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui";
import { centsToInput, money } from "@/lib/format";
import { getImpactStats } from "@/lib/impact";
import { getImpactSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [settings, stats] = await Promise.all([getImpactSettings(), getImpactStats()]);
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader title="Home page impact numbers" subtitle="These are calculated from live data. A number stays hidden until there’s real data behind it." />
      <div className="card grid gap-3 text-sm sm:grid-cols-3">
        <div><div className="text-gray-500">Families hosted locally</div><div className="text-2xl font-semibold">{stats.families ?? "hidden"}</div></div>
        <div><div className="text-gray-500">Avg. savings vs. out-of-state</div><div className="text-2xl font-semibold">{stats.savings != null ? money(stats.savings) : "hidden"}</div></div>
        <div><div className="text-gray-500">Approved venues & vendors</div><div className="text-2xl font-semibold">{stats.partners ?? "hidden"}</div></div>
      </div>
      <div className="card text-sm text-gray-700">
        <h2 className="section-title mb-2">How they’re calculated</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Families hosted</strong>: distinct families with an event marked <em>Completed</em>, plus families hosted before the portal (below).</li>
          <li><strong>Average savings</strong>: for each booked, in-production, or completed event, the out-of-state cost per guest × guest count, minus its accepted quote total, averaged. It’s hidden until you set the benchmark.</li>
          <li><strong>Approved venues & vendors</strong>: active venues plus approved vendors.</li>
        </ul>
      </div>
      <form action={saveImpactSettings} className="card grid gap-4">
        <label className="label">
          Out-of-state cost per guest ($)
          <span className="hint">Typical all-in cost per guest when families travel north for a simchah (hall, catering, travel, lodging). Leave blank to hide the savings number.</span>
          <input name="outOfStateCostPerGuest" inputMode="decimal" defaultValue={centsToInput(settings.outOfStateCostPerGuest)} className="input max-w-xs" />
        </label>
        <label className="label">
          Families hosted before the portal
          <span className="hint">Simchos SFSI hosted before online planning existed.</span>
          <input name="priorFamiliesHosted" type="number" min={0} defaultValue={settings.priorFamiliesHosted} className="input max-w-xs" />
        </label>
        <SubmitButton className="btn-primary w-fit">Save</SubmitButton>
      </form>
    </div>
  );
}
