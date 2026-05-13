import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kreatly — Your Notion-Powered Workspace",
  description: "Supercharge your Notion workspace with AI, real-time sync, and smart reminders. Just $9/month.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white">
                K
              </span>
              <span>Kreatly</span>
            </Link>
            <nav className="flex items-center gap-5 text-xs font-medium text-zinc-600">
              <Link href="/blog" className="transition hover:text-zinc-900">
                Blog
              </Link>
              <Link href="/about" className="transition hover:text-zinc-900">
                About
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-zinc-900"
              >
                Twitter
              </Link>
            </nav>
          </div>
        </header>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
