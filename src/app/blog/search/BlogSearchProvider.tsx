"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  id: string;
  title: string;
  slug: string;
  date: string | null;
};

type BlogSearchContextValue = {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const BlogSearchContext = createContext<BlogSearchContextValue | undefined>(undefined);

function useBlogSearchInternal(): BlogSearchContextValue {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const openSearch = useCallback(() => {
    setOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const meta = isMac ? event.metaKey : event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const trigger = document.querySelector<HTMLButtonElement>("[data-blog-search-trigger]");
    if (!trigger) return;

    const handleClick = () => setOpen(true);
    trigger.addEventListener("click", handleClick);
    return () => trigger.removeEventListener("click", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, query]);

  const handleSelect = (slug: string) => {
    closeSearch();
    router.push(`/blog/${encodeURIComponent(slug)}`);
  };

  return {
    open,
    openSearch,
    closeSearch,
  };
}

export default function BlogSearchProvider({ children }: { children: ReactNode }) {
  const value = useBlogSearchInternal();

  return (
    <BlogSearchContext.Provider value={value}>
      {children}
      {value.open ? (
        <SearchModal
          onClose={value.closeSearch}
        />
      ) : null}
    </BlogSearchContext.Provider>
  );
}

export function useBlogSearch(): BlogSearchContextValue {
  const ctx = useContext(BlogSearchContext);
  if (!ctx) {
    throw new Error("useBlogSearch must be used within BlogSearchProvider");
  }
  return ctx;
}

type SearchModalProps = {
  onClose: () => void;
};

function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const input = document.getElementById("blog-search-input") as HTMLInputElement | null;
    if (input) {
      input.focus();
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

  const handleSelect = (slug: string) => {
    onClose();
    router.push(`/blog/${encodeURIComponent(slug)}`);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 px-4 pt-24 backdrop-blur-sm sm:items-center sm:pt-0">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5">
          <input
            id="blog-search-input"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles by title or description…"
            className="flex-1 border-none bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-500"
          >
            Esc
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto px-1 py-2">
          {isSearching ? (
            <p className="px-3 py-2 text-xs text-zinc-500">Searching…</p>
          ) : results.length === 0 && query.trim() ? (
            <p className="px-3 py-2 text-xs text-zinc-500">No matches found.</p>
          ) : (
            <ul className="space-y-1">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item.slug)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                  >
                    <span className="truncate">{item.title}</span>
                    {item.date ? (
                      <span className="ml-4 shrink-0 text-[11px] text-zinc-500">
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

