import { eq } from "drizzle-orm";
import AccountForm from "@/components/AccountForm";
import { PageHeader, Pill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { enabledProviders, PROVIDER_LABELS } from "@/lib/oauth";

export const metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: { searchParams: { error?: string; connected?: string } }) {
  const user = await requireUser();
  const linked = await db.query.oauthAccounts.findMany({ where: eq(schema.oauthAccounts.userId, user.id) });
  const providers = enabledProviders();
  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <PageHeader title="Your account" subtitle={user.email} />
      {searchParams.error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{searchParams.error}</p>}
      {searchParams.connected && <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">Connected. You can now sign in with it.</p>}
      {providers.length > 0 && (
        <div className="card grid gap-3">
          <h2 className="section-title">Sign-in methods</h2>
          <div className="flex items-center justify-between text-sm">
            <span>Email & password</span>
            {user.hasPassword ? <Pill tone="green">Set</Pill> : <Pill>Not set</Pill>}
          </div>
          {providers.map((p) => {
            const account = linked.find((l) => l.provider === p);
            return (
              <div key={p} className="flex items-center justify-between gap-3 text-sm">
                <span>{PROVIDER_LABELS[p]}{account?.email && <span className="text-gray-500"> · {account.email}</span>}</span>
                {account ? <Pill tone="green">Connected</Pill> : <a href={`/api/auth/${p}?link=1`} className="btn-ghost btn-sm">Connect</a>}
              </div>
            );
          })}
        </div>
      )}
      <div className="card"><AccountForm name={user.name} phone={user.phone} hasPassword={user.hasPassword} /></div>
    </div>
  );
}
