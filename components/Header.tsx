import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logo-sfsi.png" alt="South Florida Simchah Initiative" width={40} height={40} priority />
          <span className="sr-only">South Florida Simchah Initiative</span>
        </Link>
        <nav className="flex gap-5 text-sm">
          <Link href="/about">About</Link>
          <Link href="/packages">Packages</Link>
          <Link href="/venues">Venues & Vendors</Link>
          <Link href="/get-involved">Get involved</Link>
          <Link href="/plan" className="btn-primary">Plan your simchah</Link>
        </nav>
      </div>
    </header>
  );
}
