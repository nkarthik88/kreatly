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
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-zinc-200">
      <header className="border-b border-zinc-800 bg-[#0a0a0a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-100"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-zinc-950">
              K
            </span>
            <span>Kreatly Blog</span>
          </Link>
          <nav className="flex items-center gap-3 text-xs font-medium text-zinc-500">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-400 shadow-sm transition hover:border-zinc-600 hover:text-zinc-200"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <span className="hidden items-center gap-0.5 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 sm:inline-flex">
                ⌘K
              </span>
            </button>
            <Link
              href="https://twitter.com"
              className="hidden text-xs transition hover:text-cyan-400 sm:inline"
              target="_blank"
              rel="noreferrer"
            >
              Twitter
            </Link>
            <Link href="/blog/rss" className="hidden text-xs transition hover:text-cyan-400 sm:inline">
              RSS
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 text-xs text-zinc-600 sm:px-6 lg:px-8">
          <span>© 2026 Kreatly. Built with Notion.</span>
          <span className="hidden sm:inline">
            Kreatly Newsroom OS · Premium reading experience
          </span>
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
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

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
        if (!response.ok || data?.success === false) {
          // eslint-disable-next-line no-console
          console.error(data?.message || "Search failed.");
          setResults([]);
          return;
        }

        setResults(Array.isArray(data.items) ? (data.items as SearchResult[]) : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        // eslint-disable-next-line no-console
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  function handleSelect(slug: string) {
    onClose();
    router.push(`/blog/${encodeURIComponent(slug)}`);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-sm sm:items-center sm:pt-0">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
          <SearchIcon className="h-4 w-4 text-zinc-500" />
          <input
            ref={inputRef}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles by title or description…"
            className="flex-1 border-none bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-500"
          >
            Esc
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto px-1 py-2">
          {isSearching ? (
            <p className="px-3 py-2 text-xs text-zinc-600">Searching…</p>
          ) : results.length === 0 && query.trim() ? (
            <p className="px-3 py-2 text-xs text-zinc-600">No matches found.</p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.slug)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-cyan-400"
                  >
                    <span className="truncate">{item.title}</span>
                    {item.date ? (
                      <span className="ml-4 shrink-0 font-mono text-[11px] text-zinc-600">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
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


