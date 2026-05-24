import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShiftDesk",
  description: "Reserve a Tuesday–Friday shift day — first come, first served.",
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
            ShiftDesk
          </Link>
          <nav className="site-nav">
            <Link href="/">Calendar</Link>
            <Link href="/my">My Days</Link>
            <Link href="/scoreboard">Scoreboard</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          Tuesday–Friday shifts &middot; one person per day
        </footer>
      </body>
    </html>
  );
}
