import { desc } from "drizzle-orm";
import { setUserRole } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await db.query.users.findMany({ orderBy: [desc(schema.users.createdAt)], columns: { passwordHash: false } });
  return (
    <div className="grid gap-6">
      <PageHeader title="Users & access" subtitle="Promote team members to operator (back office) or admin (also manages access)." />
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td>{formatDate(u.createdAt)}</td>
                <td>
                  {u.id === me.id ? <span className="text-gray-500">{u.role} (you)</span> : (
                    <form action={setUserRole} className="flex gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="role" defaultValue={u.role} className="input py-1 text-xs">
                        <option value="client">Client</option><option value="operator">Operator</option><option value="admin">Admin</option>
                      </select>
                      <SubmitButton className="btn-ghost btn-sm">Set</SubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
