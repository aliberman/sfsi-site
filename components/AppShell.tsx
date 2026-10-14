import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";

type NavItem = { href: string; label: string };

export default function AppShell({
  user,
  nav,
  badge,
  children,
}: {
  user: { name: string; email: string };
  nav: NavItem[];
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo-sfsi.png" alt="SFSI home" width={32} height={32} />
            {badge && <span className="badge bg-navy text-white">{badge}</span>}
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="hidden text-right text-xs leading-tight sm:block">
            <div className="font-medium text-gray-900">{user.name}</div>
            <div className="text-gray-500">{user.email}</div>
          </div>
          <form action={logout}>
            <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
