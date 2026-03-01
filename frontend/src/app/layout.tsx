import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BackgroundLayer from "@/components/BackgroundLayer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Landit",
  description: "Practice interview questions from a job description.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <BackgroundLayer />
        <div className="relative min-h-screen bg-transparent text-foreground">
          <header className="sticky top-0 z-40 nav-blur border-b border-border/60">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
              <Link href="/" className="font-serif text-xl font-bold tracking-tight text-foreground">
                Landit
              </Link>

              <nav className="flex items-center gap-6 text-sm">
                <Link
                  href="/job"
                  className="nav-link text-muted hover:text-foreground"
                >
                  Roles
                </Link>
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
