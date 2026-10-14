import AppShell from "@/components/AppShell";
import { requireOperator } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOperator();
  const nav = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/inquiries", label: "Inquiries" },
    { href: "/admin/catalog", label: "Catalog" },
    { href: "/admin/staff", label: "Staff" },
    { href: "/admin/venues", label: "Venues" },
    { href: "/admin/vendors", label: "Vendors" },
    { href: "/admin/packages", label: "Packages" },
    { href: "/admin/settings", label: "Settings" },
  ];
  if (user.role === "admin") nav.push({ href: "/admin/users", label: "Users" });
  return <AppShell user={user} nav={nav} badge="Back office">{children}</AppShell>;
}
