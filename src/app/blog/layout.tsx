/* eslint-disable @next/next/no-img-element */
"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";

type SearchResult = {
  id: string;
  title: string;
  slug: string;
  date: string | null;
};

export default function BlogLayout({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const meta = isMac ? event.metaKey : event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <header className="border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            Kreatly Blog
          </Link>
          <nav className="flex items-center gap-3 text-xs font-medium text-zinc-500">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-900"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[10px] text-zinc-400 sm:inline">
                ⌘K
              </kbd>
            </button>
            <Link
              href="https://twitter.com"
              className="hidden text-xs text-zinc-500 transition-colors hover:text-zinc-900 sm:inline"
              target="_blank"
              rel="noreferrer"
            >
              Twitter
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 text-xs text-zinc-400 sm:px-6 lg:px-8">
          <span>© 2026 Kreatly. Built with Notion.</span>
          <span className="hidden sm:inline">Kreatly Newsroom OS</span>
        </div>
      </footer>

      {isSearchOpen ? <SearchModal onClose={() => setIsSearchOpen(false)} /> : null}
    </div>
  );
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await fetch("/api/search", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ query }),
        });
        const data = await response.json();
        if (!response.ok || data?.success === false) { setResults([]); return; }
        setResults(Array.isArray(data.items) ? (data.items as SearchResult[]) : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => { window.clearTimeout(timeoutId); controller.abort(); };
  }, [query]);

  function handleSelect(slug: string) {
    onClose();
    router.push(`/blog/${encodeURIComponent(slug)}`);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/20 px-4 pt-24 backdrop-blur-sm sm:items-center sm:pt-0">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5">
          <SearchIcon className="h-4 w-4 text-zinc-400" />
          <input
            ref={inputRef}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles…"
            className="flex-1 border-none bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-500"
          >
            Esc
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto px-1 py-2">
          {isSearching ? (
            <p className="px-3 py-2 text-xs text-zinc-400">Searching…</p>
          ) : results.length === 0 && query.trim() ? (
            <p className="px-3 py-2 text-xs text-zinc-400">No matches found.</p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.slug)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    <span className="truncate">{item.title}</span>
                    {item.date ? (
                      <span className="ml-4 shrink-0 text-[11px] text-zinc-400">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
