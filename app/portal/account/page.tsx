import { requireUser } from "@/lib/auth";
import AccountForm from "@/components/AccountForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <PageHeader title="Your account" subtitle={user.email} />
      <div className="card"><AccountForm name={user.name} phone={user.phone} /></div>
    </div>
  );
}
