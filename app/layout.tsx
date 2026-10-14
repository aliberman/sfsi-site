import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "South Florida Simchah Initiative", template: "%s · SFSI" },
  description: "South Florida simchos, without compromise. Plan your wedding, bar/bat mitzvah, or bris locally with transparent, community-backed packages.",
  metadataBase: new URL(process.env.SITE_URL ?? "https://floridasimchah.org"),
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
