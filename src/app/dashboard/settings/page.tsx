"use client";

import type React from "react";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  doc,
  enableNetwork,
  getDoc,
  getDocFromCache,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
  const { user } = useAuth();

  // UI state only (NOT the textarea value)
  const [publicBaseUrl, setPublicBaseUrl] = useState("https://kreatly.vercel.app");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showSuccessMark, setShowSuccessMark] = useState(false);

  // Refs for uncontrolled fields
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    async function loadInitialSettings() {
      if (!user?.uid) return;
      try {
        await enableNetwork(db);
        const ref = doc(db, "users", user.uid);
        let data: Record<string, unknown> | null = null;

        try {
          const snap = await getDoc(ref);
          data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        } catch {
          // Fallback to cache if server fetch fails
          try {
            const cacheSnap = await getDocFromCache(ref);
            data = cacheSnap.exists()
              ? (cacheSnap.data() as Record<string, unknown>)
              : null;
          } catch {
            data = null;
          }
        }

        if (!data) {
          // Fallback to local base only; do not show error if we still have config
          const localBase = localStorage.getItem("kreatly_public_base_url") || "";
          if (localBase) {
            const finalBase = normalizeBaseUrl(localBase);
            setPublicBaseUrl(finalBase);
          }
          return;
        }

        const voice = typeof data.voiceBio === "string" ? String(data.voiceBio) : "";
        if (textRef.current && voice) {
          textRef.current.value = voice;
        }

        const storedBase =
          typeof data.publicBaseUrl === "string" ? String(data.publicBaseUrl) : "";
        const localBase = localStorage.getItem("kreatly_public_base_url") || "";
        const finalBase = normalizeBaseUrl(storedBase || localBase || publicBaseUrl);
        setPublicBaseUrl(finalBase);
        localStorage.setItem("kreatly_public_base_url", finalBase);
      } catch (err) {
        // Fallback to local only; don't block UI
        const localBase = localStorage.getItem("kreatly_public_base_url");
        if (localBase) {
          setPublicBaseUrl(normalizeBaseUrl(localBase));
        }
        // Surface error text once so user knows what's wrong
        const message = err instanceof Error ? err.message : "Failed to load Voice DNA settings.";
        setError(message);
      }
    }

    void loadInitialSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function handleSave() {
    if (!user?.uid) {
      const message = "You must be signed in to save Voice DNA.";
      setError(message);
      alert(message);
      return;
    }

    setIsSaving(true);
    setError(null);
    setShowSuccessMark(true);

    try {
      await enableNetwork(db);

      const rawText = textRef.current?.value ?? "";
      const voiceBio = sanitizeVoiceBio(rawText);
      const normalizedBase = normalizeBaseUrl(publicBaseUrl);
      const userRef = doc(db, "users", user.uid);

      // Fire-and-forget: let Firestore sync in background
      setDoc(
        userRef,
        {
          voiceBio,
          publicBaseUrl: normalizedBase,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ).catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to save Voice DNA settings in background.";
        setError(message);
        alert(message);
      });

      localStorage.setItem("kreatly_public_base_url", normalizedBase);
      setPublicBaseUrl(normalizedBase);
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save Voice DNA settings. Please retry.";
      setError(message);
      alert(message);
      setShowSuccessMark(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCleanPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    const clipboardText = event.clipboardData.getData("text/plain");
    const cleaned = sanitizeVoiceBio(clipboardText);
    const textarea = textRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const nextValue = textarea.value.slice(0, start) + cleaned + textarea.value.slice(end);
    textarea.value = nextValue;
    const nextCursor = start + cleaned.length;
    textarea.setSelectionRange(nextCursor, nextCursor);
  }

  return (
    <main className="min-h-screen bg-black px-10 py-10 text-white">
      <div className="mx-auto max-w-4xl rounded-xl border border-zinc-800 bg-zinc-950 p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Voice DNA Settings</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Paste 3-5 of your best past LinkedIn posts or Tweets here. Our AI will analyze your
          sentence structure, vocabulary, and rhythm to sound exactly like you.
        </p>

        <div className="mt-8">
          <label htmlFor="voice-bio" className="text-sm font-medium text-zinc-200">
            Writing Samples
          </label>
          <textarea
            id="voice-bio"
            rows={10}
            ref={textRef}
            defaultValue=""
            onPaste={handleCleanPaste}
            placeholder="Paste your best writing samples here..."
            className="mt-3 h-72 w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-500"
          />
        </div>

        <div className="mt-6">
          <label htmlFor="public-base-url" className="text-sm font-medium text-zinc-200">
            Public Site URL
          </label>
          <input
            id="public-base-url"
            type="url"
            value={publicBaseUrl}
            onChange={(event) => setPublicBaseUrl(event.target.value)}
            placeholder="https://yourdomain.com"
            className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-500"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Used for publish links and canonical metadata when posts are published.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="mt-6 rounded-md border border-cyan-400/50 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2">
            {showSuccessMark ? <Check className="h-4 w-4 text-emerald-300" /> : null}
            {isSaving ? "Saving..." : "Save Voice DNA"}
          </span>
        </button>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      </div>

      {showToast ? (
        <div className="fixed right-6 top-6 z-50 rounded-md border border-emerald-400/30 bg-zinc-900 px-3 py-2 text-xs font-semibold text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_6px_24px_rgba(16,185,129,0.25)]">
          Voice DNA saved.
        </div>
      ) : null}
    </main>
  );
}

function normalizeBaseUrl(value: string): string {
  const raw = value.trim() || "https://kreatly.vercel.app";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://kreatly.vercel.app";
  }
}

function sanitizeVoiceBio(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}
