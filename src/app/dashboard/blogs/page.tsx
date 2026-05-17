"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

type Story = {
  id: string;
  title: string;
  slug: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string | null;
  isPublished: boolean;
  lastEdited: string | null;
  publishStatus: string;
};

const DEFAULT_PUBLIC_APP_URL = "https://kreatly.vercel.app";

export default function BlogsPage() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPublishedPanel, setShowPublishedPanel] = useState(false);
  const [publicBaseUrl, setPublicBaseUrl] = useState(DEFAULT_PUBLIC_APP_URL);
  const toastTimeoutRef = useRef<number | null>(null);
  const publishedStories = stories.filter((story) => story.isPublished && story.slug);

  useEffect(() => {
    void loadBlogsFromFirestore();
  }, []);

  useEffect(() => {
    const localBaseUrl = localStorage.getItem("kreatly_public_base_url");
    if (localBaseUrl?.trim()) {
      setPublicBaseUrl(normalizeBaseUrl(localBaseUrl));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  function openToast(message: string) {
    setToast(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 1600);
  }

  function getPublicUrl(slug: string): string {
    return `${publicBaseUrl}/b/${slug}`;
  }

  function clearCacheAndResync() {
    localStorage.removeItem("kreatly_blog_rows");
    sessionStorage.removeItem("kreatly_blog_rows");
    setStories([]);
    setError(null);
    // eslint-disable-next-line no-console
    console.log("[BlogsPage] Clear cache & resync clicked");
    void handleSync();
  }

  async function loadBlogsFromFirestore() {
    // eslint-disable-next-line no-console
    console.log("[BlogsPage] loadBlogsFromFirestore: start");
    setError(null);
    try {
      const blogsCol = collection(db, "blogs");
      const q = query(blogsCol, orderBy("lastEdited", "desc"));
      const snapshot = await getDocs(q);

      const mapped: Story[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        const title = (data.title as string) || "Untitled Post";
        const slug =
          (data.slug as string) || docSnap.id.replace(/-/g, "").toLowerCase();
        const status = (data.status as string) || "Draft";
        const isPublishedFromStatus = status.toLowerCase().includes("publish");
        const isPublished =
          typeof data.isPublished === "boolean"
            ? data.isPublished
            : isPublishedFromStatus;

        return {
          id: docSnap.id,
          title,
          slug,
          content: (data.content as string) || "",
          seoTitle: (data.seoTitle as string) || title,
          seoDescription: (data.seoDescription as string) || "",
          ogImage: (data.coverImage as string) || data.ogImage || null,
          isPublished,
          lastEdited: (data.lastEdited as string) || (data.date as string) || null,
          publishStatus: status || (isPublished ? "Published" : "Draft"),
        };
      });

      const mergedWithOverrides = await Promise.all(
        mapped.map(async (story) => {
          if (!story.slug) return story;
          try {
            const publishedRef = doc(db, "publicPosts", story.slug);
            const snapshot = await getDoc(publishedRef);
            const publishOverride = snapshot.data()?.isPublished;
            if (typeof publishOverride === "boolean") {
              return {
                ...story,
                isPublished: publishOverride,
                publishStatus: publishOverride ? "Published" : "Draft",
              };
            }
          } catch {
            return story;
          }
          return story;
        }),
      );

      setStories(mergedWithOverrides);
      localStorage.setItem("kreatly_blog_rows", JSON.stringify(mergedWithOverrides));
      sessionStorage.setItem("kreatly_blog_rows", JSON.stringify(mergedWithOverrides));
      // eslint-disable-next-line no-console
      console.log("[BlogsPage] loaded", mergedWithOverrides.length, "stories");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load blogs from Firestore.";
      setError(message);
      setStories([]);
      localStorage.removeItem("kreatly_blog_rows");
      sessionStorage.removeItem("kreatly_blog_rows");
      // eslint-disable-next-line no-console
      console.error("[BlogsPage] loadBlogsFromFirestore: error", err);
    }
  }

  async function handleSync() {
    // eslint-disable-next-line no-console
    console.log("[BlogsPage] handleSync: start");
    setIsSyncing(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20000);

      const res = await fetch("/api/notion/sync", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user?.uid ?? null }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type");

      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          let errData: any = {};
          try { errData = await res.json(); } catch { /* ignore */ }
          throw new Error(errData?.error || errData?.message || "Sync failed on server");
        } else {
          const textError = await res.text();
          throw new Error(`Server error: ${textError.substring(0, 80)}…`);
        }
      }

      const data = contentType && contentType.includes("application/json")
        ? await res.json()
        : {};

      const count = typeof data?.count === "number" ? data.count : 0;
      openToast(count > 0 ? `Sync complete. ${count} posts synced.` : "Sync complete.");
      await loadBlogsFromFirestore();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Sync timed out after 20 seconds. Please try again."
            : err.message
          : "Failed to sync Notion";
      setError(message);
      openToast(message);
      // eslint-disable-next-line no-console
      console.error("[BlogsPage] handleSync: error", err);
      if (typeof window !== "undefined") window.alert(message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handlePublishToggle(story: Story, checked: boolean) {
    if (!story.slug) {
      setError("This story does not have a valid slug yet.");
      return;
    }

    setError(null);
    try {
      const publicRef = doc(db, "publicPosts", story.slug);
      await setDoc(
        publicRef,
        {
          storyId: story.id,
          slug: story.slug,
          siteId: user?.uid ?? null,
          title: story.title || "Untitled Post",
          content: story.content || story.title || "",
          seoTitle: story.seoTitle || story.title || "Untitled Post",
          seoDescription: story.seoDescription || story.content.slice(0, 180),
          ogImage: story.ogImage || null,
          publicBaseUrl,
          isPublished: checked,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setStories((prev) =>
        prev.map((item) =>
          item.id === story.id
            ? { ...item, isPublished: checked, publishStatus: checked ? "Published" : "Draft" }
            : item,
        ),
      );
      openToast(checked ? "Post published." : "Post moved to draft.");
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update publish state.");
    }
  }

  async function handleCopyPublicLink(slug: string) {
    try {
      await navigator.clipboard.writeText(getPublicUrl(slug));
      openToast("Link copied.");
    } catch {
      setError("Could not copy link.");
    }
  }

  function handleOpenPublicSite() {
    if (publishedStories.length === 0) {
      openToast("Publish at least one post first.");
      return;
    }
    window.open(getPublicUrl(publishedStories[0].slug), "_blank", "noopener,noreferrer");
    setShowPublishedPanel(true);
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">

      {/* Header row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Content</h1>
          <p className="mt-0.5 text-[13px] text-zinc-400">
            {stories.length} {stories.length === 1 ? "post" : "posts"} synced from Notion
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPublicSite}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View site
          </button>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isSyncing ? "Syncing…" : "Sync Notion"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-[13px] text-red-500">{error}</p>
      ) : null}

      {/* Published links panel */}
      {showPublishedPanel ? (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
              Published Links
            </p>
            <button
              type="button"
              onClick={() => setShowPublishedPanel(false)}
              className="text-[13px] text-zinc-400 hover:text-zinc-700"
            >
              Hide
            </button>
          </div>
          {publishedStories.length === 0 ? (
            <p className="text-[13px] text-zinc-400">No published posts yet.</p>
          ) : (
            <div className="space-y-2">
              {publishedStories.map((story) => (
                <div
                  key={`published-${story.id}`}
                  className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-zinc-900">
                      {story.title || "Untitled Post"}
                    </p>
                    <p className="truncate text-xs text-zinc-400">{getPublicUrl(story.slug)}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <Link
                      href={`/b/${story.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-50"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleCopyPublicLink(story.slug)}
                      className="inline-flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-50"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Posts table */}
      <div className="mt-8">
        {stories.length > 0 ? (
          <div className="divide-y divide-zinc-100 border-t border-zinc-100">
            {stories.map((story) => (
              <article
                key={story.id}
                className="flex items-center gap-4 py-4 transition-colors hover:bg-zinc-50"
              >
                {/* Title */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/blog/${encodeURIComponent(story.slug)}`}
                    className="block truncate text-[13px] font-medium text-zinc-900 hover:underline"
                  >
                    {story.title?.trim() || (isSyncing ? "Syncing…" : "Untitled Post")}
                  </Link>
                  {story.isPublished ? (
                    <p className="mt-0.5 truncate text-xs text-zinc-400">
                      {getPublicUrl(story.slug)}
                    </p>
                  ) : null}
                </div>

                {/* Date */}
                <p className="w-28 shrink-0 text-right text-xs text-zinc-400">
                  {formatLastEdited(story.lastEdited)}
                </p>

                {/* Status pill + toggle */}
                <div className="w-36 shrink-0">
                  <label className="inline-flex w-full items-center justify-end gap-2">
                    <span
                      className={
                        story.isPublished
                          ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"
                          : "rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-500"
                      }
                    >
                      {story.isPublished ? "Published" : "Draft"}
                    </span>
                    <input
                      type="checkbox"
                      checked={story.isPublished}
                      onChange={(e) => void handlePublishToggle(story, e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-zinc-900"
                    />
                  </label>
                </div>

                {/* Actions */}
                <div className="w-44 shrink-0 text-right">
                  {story.isPublished ? (
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/b/${story.slug}`}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-50"
                        target="_blank"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleCopyPublicLink(story.slug)}
                        className="inline-flex items-center gap-1 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-50"
                      >
                        <Copy className="h-3 w-3" />
                        Copy link
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-300">—</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50">
            <div className="text-center">
              <p className="text-[13px] text-zinc-500">
                {isSyncing ? "Syncing from Notion…" : "No content yet. Sync Notion to begin."}
              </p>
              {!isSyncing ? (
                <button
                  type="button"
                  onClick={clearCacheAndResync}
                  className="mt-3 rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  Clear cache & resync
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-xs text-zinc-400">
          If this persists, check server logs for Notion sync details.
        </p>
      ) : null}

      {toast ? (
        <div className="fixed right-6 top-6 z-50 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-[13px] font-medium text-zinc-700 shadow-md">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function normalizeBaseUrl(value: string): string {
  const raw = value.trim() || DEFAULT_PUBLIC_APP_URL;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_PUBLIC_APP_URL;
  }
}

function formatLastEdited(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
