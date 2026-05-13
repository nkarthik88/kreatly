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
      console.log(
        "[BlogsPage] loadBlogsFromFirestore: loaded stories",
        mergedWithOverrides.length,
      );
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
      console.log("[BlogsPage] handleSync: calling /api/notion/sync");

      // Enforce a hard 15s client-side timeout so the button
      // never spins forever if the server hangs.
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, 20000);

      const res = await fetch("/api/notion/sync", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);
      console.log("[BlogsPage] handleSync: response received", res.status);

      const contentType = res.headers.get("content-type");

      if (!res.ok) {
        if (contentType && contentType.includes("application/json")) {
          let errData: any = {};
          try {
            errData = await res.json();
          } catch {
            // ignore JSON parse error here; fall back to generic
          }
          throw new Error(
            errData?.error ||
              errData?.message ||
              "Sync failed on server",
          );
        } else {
          const textError = await res.text();
          throw new Error(
            `Server Timeout (504) or Crash. Vercel says: ${textError.substring(
              0,
              80,
            )}...`,
          );
        }
      }

      const data = contentType && contentType.includes("application/json")
        ? await res.json()
        : {};

      console.log("[BlogsPage] handleSync: parsed response body", data);

      const count = typeof data?.count === "number" ? data.count : 0;
      const successMessage =
        count > 0
          ? `Sync complete. ${count} posts synced from Notion.`
          : "Sync complete.";
      openToast(successMessage);
      console.log("[BlogsPage] handleSync: success", { count });

      await loadBlogsFromFirestore();
      console.log("[BlogsPage] handleSync: finished reloading blogs");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Sync request exceeded 20 seconds and was cancelled. Please try again."
            : err.message
          : "Failed to sync Notion";
      setError(message);
      openToast(message);
      // eslint-disable-next-line no-console
      console.error("[BlogsPage] handleSync: error", err);
      if (typeof window !== "undefined") {
        // Surface critical failures to the user explicitly.
        window.alert(message);
      }
    } finally {
      setIsSyncing(false);
      // eslint-disable-next-line no-console
      console.log("[BlogsPage] handleSync: end");
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
      openToast("Public link copied.");
    } catch {
      setError("Could not copy public link.");
    }
  }

  function handleOpenPublicSite() {
    if (publishedStories.length === 0) {
      openToast("Publish at least one post first.");
      return;
    }

    const firstUrl = getPublicUrl(publishedStories[0].slug);
    window.open(firstUrl, "_blank", "noopener,noreferrer");
    setShowPublishedPanel(true);
  }

  return (
    <div className="min-h-screen bg-white text-black px-10 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-black">
          THE BLOGS
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenPublicSite()}
            disabled={publishedStories.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Public Site
          </button>
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
      </div>

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      {showPublishedPanel ? (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Published Links
            </p>
            <button
              type="button"
              onClick={() => setShowPublishedPanel(false)}
              className="text-xs font-medium text-zinc-500 hover:text-black"
            >
              Hide
            </button>
          </div>
          {publishedStories.length === 0 ? (
            <p className="text-xs text-zinc-500">No published posts yet.</p>
          ) : (
            <div className="space-y-2">
              {publishedStories.map((story) => (
                <div
                  key={`published-${story.id}`}
                  className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-black">
                      {story.title || "Untitled Post"}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{getPublicUrl(story.slug)}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <Link
                      href={`/b/${story.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-[4px] border border-[#E5E5E5] px-2 py-1 text-xs text-black"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleCopyPublicLink(story.slug)}
                      className="inline-flex items-center gap-1 rounded-[4px] border border-[#E5E5E5] px-2 py-1 text-xs text-black"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-8">
        {stories.length > 0 ? (
          <div className="border-t border-zinc-200">
            {stories.map((story) => (
              <article
                key={story.id}
                className="grid grid-cols-[minmax(0,1fr)_220px_220px_220px] items-center gap-4 border-b border-zinc-200 bg-white py-5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/writer/${encodeURIComponent(story.id)}`}
                    className="truncate text-base font-semibold text-zinc-900 underline-offset-2 hover:underline"
                  >
                    {story.title?.trim() || (isSyncing ? "Syncing..." : "Untitled Post")}
                  </Link>
                  {story.isPublished ? (
                    <p className="mt-1 truncate text-xs text-zinc-500">{getPublicUrl(story.slug)}</p>
                  ) : null}
                </div>
                <p className="justify-self-end text-sm text-zinc-500">
                  {formatLastEdited(story.lastEdited)}
                </p>
                <div className="justify-self-end">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
                    <span
                      className={
                        story.isPublished
                          ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600"
                      }
                    >
                      {story.isPublished ? "Published" : "Draft"}
                    </span>
                    <input
                      type="checkbox"
                      checked={story.isPublished}
                      onChange={(event) => void handlePublishToggle(story, event.target.checked)}
                      className="h-4 w-4 accent-black"
                    />
                  </label>
                </div>
                <div className="justify-self-end">
                  {story.isPublished ? (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/b/${story.slug}`}
                        className="rounded-[4px] border border-[#E5E5E5] px-2 py-1 text-xs text-black"
                        target="_blank"
                      >
                        View Post
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleCopyPublicLink(story.slug)}
                        className="inline-flex items-center gap-1 rounded-[4px] border border-[#E5E5E5] px-2 py-1 text-xs text-black"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy Public Link
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">Not Published</span>
                  )}
                </div>
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
      {toast ? (
        <div className="fixed right-6 top-6 z-50 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_6px_20px_rgba(16,185,129,0.2)]">
          <Check className="h-3.5 w-3.5" />
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
