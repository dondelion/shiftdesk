import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { LoaderDefs } from "./loaders";

export const metadata: Metadata = {
  title: "Cancer Shift",
  description: "Cancer Shift — reserve a Tuesday–Friday shift day, first come, first served.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LoaderDefs />
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-dot" />
            Cancer Shift
          </Link>
          <nav className="site-nav">
            <Link href="/">Calendar</Link>
            <Link href="/my">My Days</Link>
            <Link href="/scoreboard">Scoreboard</Link>
            <Link href="/changelog">What&rsquo;s new</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          Cancer Shift &middot; Tuesday–Friday &middot; one person per day
        </footer>
      </body>
    </html>
  );
}
