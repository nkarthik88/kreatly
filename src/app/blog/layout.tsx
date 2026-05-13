import type { ReactNode } from "react";
import Link from "next/link";
import BlogSearchProvider from "./search/BlogSearchProvider";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <BlogSearchProvider>
      <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href="/blog"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                K
              </span>
              <span>Kreatly Blog</span>
            </Link>
            <nav className="flex items-center gap-4 text-xs font-medium text-zinc-600">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
                data-blog-search-trigger
              >
                <span>Search</span>
                <span className="hidden items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 sm:inline-flex">
                  ⌘K
                </span>
              </button>
              <Link
                href="https://twitter.com"
                className="hidden text-xs transition hover:text-zinc-900 sm:inline"
                target="_blank"
                rel="noreferrer"
              >
                Twitter
              </Link>
              <Link href="/blog/rss" className="hidden text-xs transition hover:text-zinc-900 sm:inline">
                RSS
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
          {children}
        </main>

        <footer className="border-t border-zinc-200 bg-white/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 text-xs text-zinc-500 sm:px-6 lg:px-8">
            <span>© 2026 Kreatly. Built with Notion.</span>
            <span className="hidden sm:inline">
              Kreatly Newsroom OS · Feather-style reading experience
            </span>
          </div>
        </footer>
      </div>
    </BlogSearchProvider>
  );
}

