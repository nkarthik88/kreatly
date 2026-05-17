"use client";

import { useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SubscribeBox({ slug }: { slug?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      setState("error");
      return;
    }

    setState("loading");
    setErrorMsg("");

    try {
      // Resolve the site owner's uid from publicPosts so each blog owner
      // gets their own subscriber list.
      let siteId: string | null = null;
      if (slug) {
        try {
          const postSnap = await getDoc(doc(db, "publicPosts", slug));
          siteId = postSnap.data()?.siteId ?? null;
        } catch {
          // non-fatal — siteId stays null
        }
      }

      // Doc ID = siteId/email so a reader can only subscribe once per blog.
      const docId = siteId ? `${siteId}_${trimmed}` : trimmed;
      await setDoc(
        doc(db, "subscribers", docId),
        {
          email: trimmed,
          siteId,
          subscribedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setState("success");
      setEmail("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-3xl border-t border-zinc-100 pt-12">
      <div className="rounded-xl border border-zinc-200 bg-white px-8 py-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Newsletter
        </p>
        <h3 className="mt-2 text-lg font-bold tracking-tight text-zinc-900">
          Stay in the loop
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
          New articles delivered straight to your inbox. No spam, unsubscribe any time.
        </p>

        {state === "success" ? (
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[13px] font-medium text-emerald-700">
              You&apos;re subscribed! Look out for new posts in your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setState("idle"); setErrorMsg(""); }}
                placeholder="you@example.com"
                required
                className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300 transition-colors focus:border-zinc-500"
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="shrink-0 rounded-md bg-zinc-900 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
            {state === "error" && errorMsg ? (
              <p className="mt-2 text-xs text-red-500">{errorMsg}</p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
