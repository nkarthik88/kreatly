"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";

type Story = {
  id: string;
  title: string;
  slug?: string;
  isPublished?: boolean;
  lastEdited: string | null;
  publishStatus: string;
};

export default function BlogsPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void handleSync();
  }, []);

  function clearCacheAndResync() {
    localStorage.removeItem("kreatly_blog_rows");
    sessionStorage.removeItem("kreatly_blog_rows");
    setStories([]);
    setError(null);
    void handleSync();
  }

  async function handleSync() {
    setIsSyncing(true);
    setError(null);

    try {
      const setupRaw =
        localStorage.getItem("kreatly_setup") ||
        sessionStorage.getItem("kreatly_setup");
      const setupConfig = setupRaw ? JSON.parse(setupRaw) : null;

      const res = await fetch("/api/notion/sync", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: setupConfig?.databaseId,
        }),
      });
      let data = await res.json();

      if ((!res.ok || data?.success === false) && setupConfig?.databaseId) {
        // Retry with server-side fallback ID from env/local configuration.
        const fallbackRes = await fetch("/api/notion/sync", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok && fallbackData?.success !== false) {
          data = fallbackData;
        } else {
          throw new Error(
            fallbackData?.message || data?.message || "Failed to sync Notion",
          );
        }
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      const mapped: Story[] = items.map((item: any) => ({
        id: item.id,
        title:
          item.title ||
          item.Name ||
          item.name ||
          item?.properties?.title?.[0]?.plain_text ||
          item?.properties?.Name?.title?.[0]?.plain_text ||
          item?.properties?.Title?.title?.[0]?.plain_text ||
          "",
        slug: item.slug || item.id?.replace(/-/g, "").toLowerCase() || null,
        isPublished: Boolean(item.is_published),
        lastEdited: item.last_edited_time || null,
        publishStatus: item.publish_status || "Draft",
      }));
      setStories(mapped);
      localStorage.setItem("kreatly_blog_rows", JSON.stringify(mapped));
      sessionStorage.setItem("kreatly_blog_rows", JSON.stringify(mapped));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sync Notion";
      setError(message);
      setStories([]);
      localStorage.removeItem("kreatly_blog_rows");
      sessionStorage.removeItem("kreatly_blog_rows");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-black px-10 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-black">
          THE BLOGS
        </h1>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-900 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {isSyncing ? "Syncing..." : "Sync Notion"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

      <div className="mt-8">
        {stories.length > 0 ? (
          <div className="border-t border-zinc-200">
            {stories.map((story) => (
              <article
                key={story.id}
                className="grid grid-cols-[minmax(0,1fr)_220px_130px_120px] items-center gap-4 border-b border-zinc-200 bg-white py-5"
              >
                <Link
                  href={`/dashboard/writer/${encodeURIComponent(story.id)}`}
                  className="truncate text-base font-semibold tracking-tight text-black underline-offset-2 hover:underline"
                >
                  {story.title?.trim() || (isSyncing ? "Syncing..." : "Untitled Post")}
                </Link>
                <p className="justify-self-end text-sm text-zinc-500">
                  {formatLastEdited(story.lastEdited)}
                </p>
                <span className="justify-self-end rounded-[4px] border border-[#E5E5E5] px-2 py-1 text-xs text-zinc-600">
                  {story.publishStatus}
                </span>
                {story.isPublished && story.slug ? (
                  <Link
                    href={`/blog/${story.slug}`}
                    className="justify-self-end rounded-[4px] border border-[#E5E5E5] px-2 py-1 text-xs text-black"
                  >
                    View Post
                  </Link>
                ) : (
                  <span className="justify-self-end text-xs text-zinc-400">
                    Not Published
                  </span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center border border-dashed border-zinc-200 bg-white">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600">
                {isSyncing
                  ? "Syncing..."
                  : "Your Blogs list is empty. Sync Notion to begin."}
              </p>
              {!isSyncing ? (
                <button
                  type="button"
                  onClick={clearCacheAndResync}
                  className="mt-3 rounded-[4px] border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-black"
                >
                  Clear Cache & Resync
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-3 text-xs text-zinc-500">
          If this persists, open server logs for attempted/resolved Notion IDs.
        </p>
      )}
    </div>
  );
}

function formatLastEdited(value: string | null): string {
  if (!value) return "Last edited —";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last edited —";
  return `Last edited ${date.toLocaleString()}`;
}
