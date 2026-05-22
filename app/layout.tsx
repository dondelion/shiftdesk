import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shift Reservations",
  description: "Reserve a day for your shift — first come, first served.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-dot" />
            Shift Reservations
          </Link>
          <nav className="site-nav">
            <Link href="/">Calendar</Link>
            <Link href="/my">My Days</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          First come, first served &middot; one person per day
        </footer>
      </body>
    </html>
  );
}
