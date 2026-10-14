import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 bg-navy text-white/80">
      <div className="container grid gap-8 py-12 text-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-display text-lg font-semibold text-white">South Florida Simchah Initiative</div>
          <p className="mt-2 max-w-sm">
            Keep the simchah in the community. Save families money. Strengthen our local Jewish life.
          </p>
        </div>
        <div className="grid gap-2">
          <div className="font-medium text-white">Celebrate</div>
          <Link href="/plan" className="hover:text-white">Plan your simchah</Link>
          <Link href="/packages" className="hover:text-white">Packages & pricing</Link>
          <Link href="/venues" className="hover:text-white">Venues & vendors</Link>
          <Link href="/portal" className="hover:text-white">Family portal</Link>
        </div>
        <div className="grid gap-2">
          <div className="font-medium text-white">Get involved</div>
          <Link href="/donate" className="hover:text-white">Donate</Link>
          <Link href="/partners" className="hover:text-white">Become a partner</Link>
          <Link href="/about" className="hover:text-white">About SFSI</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container py-5 text-xs text-white/60">
          © {new Date().getFullYear()} South Florida Simchah Initiative — floridasimchah.org
        </div>
      </div>
    </footer>
  );
}
