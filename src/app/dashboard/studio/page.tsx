"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Story = {
  id: string;
  title: string;
  last_edited_time: string | null;
  content?: string;
};

type Channel = "linkedin" | "x" | "reddit" | "seo-geo";

export default function StudioPage() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [storyContent, setStoryContent] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>("linkedin");
  const [usedVoiceProfile, setUsedVoiceProfile] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [didCopyDraft, setDidCopyDraft] = useState(false);
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);
  const copyToastTimeoutRef = useRef<number | null>(null);
  const successPulseTimeoutRef = useRef<number | null>(null);
  const draftLabel =
    channel === "x"
      ? "Draft X/Twitter"
      : channel === "reddit"
        ? "Draft Reddit"
        : channel === "seo-geo"
          ? "SEO/GEO Optimize"
          : "Draft LinkedIn";

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedId) ?? null,
    [stories, selectedId],
  );

  useEffect(() => {
    void loadStories();
  }, []);

  useEffect(() => {
    return () => {
      if (copyToastTimeoutRef.current) {
        window.clearTimeout(copyToastTimeoutRef.current);
      }
      if (successPulseTimeoutRef.current) {
        window.clearTimeout(successPulseTimeoutRef.current);
      }
    };
  }, []);

  async function loadStories() {
    setIsLoadingStories(true);
    setError(null);
    try {
      const cachedRows =
        localStorage.getItem("kreatly_blog_rows") ||
        sessionStorage.getItem("kreatly_blog_rows");
      if (cachedRows) {
        try {
          const parsed = JSON.parse(cachedRows) as Story[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStories(parsed);
          }
        } catch {
          // ignore invalid cache
        }
      }

      const setupRaw =
        localStorage.getItem("kreatly_setup") ||
        sessionStorage.getItem("kreatly_setup");
      const setupConfig = setupRaw ? JSON.parse(setupRaw) : null;

      const response = await fetch("/api/notion/sync", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: setupConfig?.databaseId,
        }),
      });
      let data = await response.json();

      if ((!response.ok || data?.success === false) && setupConfig?.databaseId) {
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
            fallbackData?.message || data?.message || "Failed to load stories.",
          );
        }
      }

      const items = Array.isArray(data?.items) ? (data.items as Story[]) : [];
      setStories(items);
      localStorage.setItem("kreatly_blog_rows", JSON.stringify(items));
      sessionStorage.setItem("kreatly_blog_rows", JSON.stringify(items));

      if (items.length > 0) {
        await handleSelectStory(items[0].id, items);
      } else {
        setSelectedId(null);
        setStoryContent("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stories.");
    } finally {
      setIsLoadingStories(false);
    }
  }

  async function handleSelectStory(id: string, sourceStories?: Story[]) {
    const availableStories = sourceStories ?? stories;
    const chosen = availableStories.find((story) => story.id === id);

    setSelectedId(id);
    setGeneratedContent("");
    setStoryContent("");
    setIsLoadingContent(true);
    setError(null);

    try {
      const quickContent =
        typeof chosen?.content === "string" ? chosen.content.trim() : "";
      if (quickContent) {
        setStoryContent(quickContent);
        return;
      }

      const response = await fetch(
        `/api/notion/content?pageId=${encodeURIComponent(id)}&t=${Date.now()}`,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to load story content.");
      }

      const content =
        typeof data?.content === "string" && data.content.trim()
          ? data.content
          : "No readable content found for this page.";
      setStoryContent(content);

      setStories((prev) =>
        prev.map((story) =>
          story.id === id ? { ...story, content: content } : story,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load story content.",
      );
    } finally {
      setIsLoadingContent(false);
    }
  }

  async function handleGenerate() {
    if (!selectedId || !storyContent.trim()) {
      setError("Select a story with content before generating.");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent("");
    setUsedVoiceProfile(false);
    setError(null);
    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user?.uid,
          pageId: selectedId,
          content: storyContent,
          channel,
        }),
      });
      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to generate post.");
      }

      setGeneratedContent(
        typeof data?.generatedContent === "string"
          ? data.generatedContent
          : "No generation output returned.",
      );
      setUsedVoiceProfile(Boolean(data?.usedVoiceProfile));
      if (successPulseTimeoutRef.current) {
        window.clearTimeout(successPulseTimeoutRef.current);
      }
      setShowSuccessPulse(true);
      successPulseTimeoutRef.current = window.setTimeout(() => {
        setShowSuccessPulse(false);
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate post.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyDraft() {
    if (!generatedContent.trim()) return;

    try {
      await navigator.clipboard.writeText(generatedContent);
      setDidCopyDraft(true);
      setShowCopiedToast(true);

      if (copyToastTimeoutRef.current) {
        window.clearTimeout(copyToastTimeoutRef.current);
      }

      copyToastTimeoutRef.current = window.setTimeout(() => {
        setShowCopiedToast(false);
        setDidCopyDraft(false);
      }, 1400);
    } catch {
      setError("Could not copy draft to clipboard.");
    }
  }

  return (
    <main className="bg-white px-10 py-10">
      <div className="grid min-h-[680px] grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black">
              Blog Stories
            </p>
          </div>
          <div className="max-h-[640px] overflow-y-auto">
            {isLoadingStories ? (
              <p className="px-4 py-4 text-sm text-zinc-500">Loading stories…</p>
            ) : stories.length === 0 ? (
              <p className="px-4 py-4 text-sm text-zinc-500">
                No stories yet. Sync Blogs first.
              </p>
            ) : (
              stories.map((story) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => void handleSelectStory(story.id)}
                  className={`w-full border-b border-zinc-200 px-4 py-3 text-left transition-colors ${
                    selectedId === story.id ? "bg-zinc-50" : "bg-white"
                  }`}
                >
                  <p className="truncate text-sm font-semibold tracking-tight text-black">
                    {story.title?.trim() || (isLoadingStories ? "Syncing..." : "Untitled Post")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatLastEdited(story.last_edited_time)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Kreatly Writer
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-black">
                {selectedStory?.title || "Select a story"}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isGenerating || !selectedId || !storyContent}
              className="rounded-[4px] border border-black bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : draftLabel}
            </button>
          </div>

          <div className="grid gap-0 lg:grid-cols-2">
            <div className="border-b border-zinc-200 p-6 lg:border-b-0 lg:border-r">
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                Story Text
              </p>
              {isLoadingContent ? (
                <p className="mt-4 text-sm text-zinc-500">Loading content…</p>
              ) : (
                <div className="mt-4 min-h-[430px] whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {storyContent || "Select a story from the left rail."}
                </div>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4">
                <ChannelButton
                  label="LinkedIn Post"
                  active={channel === "linkedin"}
                  onClick={() => setChannel("linkedin")}
                />
                <ChannelButton
                  label="X/Twitter Thread"
                  active={channel === "x"}
                  onClick={() => setChannel("x")}
                />
                <ChannelButton
                  label="Reddit Post"
                  active={channel === "reddit"}
                  onClick={() => setChannel("reddit")}
                />
                <ChannelButton
                  label="SEO/GEO Optimize"
                  active={channel === "seo-geo"}
                  onClick={() => setChannel("seo-geo")}
                />
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Claude Draft</p>
                  {usedVoiceProfile ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                      Voice DNA Active
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyDraft()}
                  disabled={!generatedContent.trim()}
                  className="inline-flex items-center justify-center rounded-[4px] border border-zinc-200 p-2 text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Copy draft to clipboard"
                  title="Copy draft"
                >
                  {didCopyDraft ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              {isGenerating ? (
                <div className="mt-4 flex min-h-[430px] items-center justify-center border border-zinc-200 bg-zinc-50">
                  <div className="text-center">
                    <p className="animate-pulse text-sm font-medium tracking-tight text-zinc-700">
                      Generating...
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Claude is drafting your viral-style post.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={`mt-4 min-h-[430px] whitespace-pre-wrap border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-800 transition-shadow duration-300 ${
                    showSuccessPulse
                      ? "animate-pulse shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_24px_rgba(16,185,129,0.28)]"
                      : ""
                  }`}
                >
                  {generatedContent || "Your generated draft appears here."}
                </div>
              )}
            </div>
          </div>

          {error ? (
            <p className="border-t border-zinc-200 px-6 py-3 text-sm text-red-500">
              {error}
            </p>
          ) : null}
        </section>
      </div>
      {showCopiedToast ? (
        <div className="fixed right-6 top-6 z-50 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_6px_20px_rgba(16,185,129,0.2)]">
          Copied!
        </div>
      ) : null}
    </main>
  );
}

function formatLastEdited(value: string | null): string {
  if (!value) return "Last edited —";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Last edited —";
  return `Last edited ${parsed.toLocaleDateString()}`;
}

function ChannelButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[170px] rounded-[4px] border px-4 py-2.5 text-sm font-medium ${
        active
          ? "border-black bg-black text-white"
          : "border-[#E5E5E5] bg-white text-black"
      }`}
    >
      {label}
    </button>
  );
}
