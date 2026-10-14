import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { sessionHint } from "@/components/session-hint";

const NAV = [
  { href: "/about", label: "About" },
  { href: "/packages", label: "Packages" },
  { href: "/venues", label: "Venues & Vendors" },
  { href: "/get-involved", label: "Get involved" },
];

export default async function Header() {
  const session = await sessionHint();
  const portalHref = session && (session.role === "operator" || session.role === "admin") ? "/admin" : "/portal";

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/images/logo-sfsi.png" alt="" width={40} height={40} priority />
          <span className="font-display text-lg font-semibold leading-tight text-navy">
            South Florida <span className="hidden sm:inline">Simchah Initiative</span>
            <span className="sm:hidden">Simchah</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-gray-700 hover:text-brand-700">
              {n.label}
            </Link>
          ))}
          {session ? (
            <Link href={portalHref} className="btn-ghost">My portal</Link>
          ) : (
            <Link href="/login" className="text-gray-700 hover:text-brand-700">Sign in</Link>
          )}
          <Link href="/plan" className="btn-primary">Plan your simchah</Link>
        </nav>
        <details className="relative md:hidden">
          <summary className="list-none cursor-pointer rounded-lg p-2 hover:bg-gray-100" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white p-2 shadow-lg">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
                {n.label}
              </Link>
            ))}
            <Link href={session ? portalHref : "/login"} className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
              {session ? "My portal" : "Sign in"}
            </Link>
            <Link href="/plan" className="btn-primary mt-2 w-full">Plan your simchah</Link>
          </div>
        </details>
      </div>
    </header>
  );
}
