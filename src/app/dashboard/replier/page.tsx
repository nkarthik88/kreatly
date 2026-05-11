"use client";

import { useState } from "react";

export default function ReplierPage() {
  const [comment, setComment] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateReply() {
    if (!comment.trim()) {
      setError("Paste a social media comment first.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setReply("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "replier",
          content: comment,
        }),
      });
      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to generate reply.");
      }

      setReply(
        typeof data?.generatedContent === "string"
          ? data.generatedContent
          : "No output returned.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate reply.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="bg-white px-10 py-10">
      <div className="max-w-5xl">
        <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-black">
          Replier
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Paste a social comment and generate a high-value response that drives
          qualified traffic back to your SaaS.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <section className="border border-[#E5E5E5] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Incoming Comment
            </p>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Paste a social media comment here..."
              className="mt-4 h-72 w-full resize-none border border-[#E5E5E5] p-3 text-sm text-black outline-none"
            />
            <button
              type="button"
              onClick={() => void handleGenerateReply()}
              disabled={isGenerating}
              className="mt-4 rounded-[4px] border border-black bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate Reply"}
            </button>
          </section>

          <section className="border border-[#E5E5E5] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Suggested Response
            </p>
            <div className="mt-4 min-h-72 whitespace-pre-wrap border border-[#E5E5E5] p-3 text-sm text-zinc-800">
              {reply || "Your Claude-generated response appears here."}
            </div>
          </section>
        </div>

        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      </div>
    </main>
  );
}
