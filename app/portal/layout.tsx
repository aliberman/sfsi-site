import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = [
    { href: "/portal", label: "My events" },
    { href: "/portal/events/new", label: "New event" },
    { href: "/portal/account", label: "Account" },
  ];
  if (user.role !== "client") nav.push({ href: "/admin", label: "Back office" });
  return <AppShell user={user} nav={nav}>{children}</AppShell>;
}
