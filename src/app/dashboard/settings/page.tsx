"use client";

import type React from "react";
import {
  Check,
  Globe2,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";
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
import { useSearchParams } from "next/navigation";

export default function SettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const initialNotionFromQuery = searchParams.get("notionUrl") || "";
  const [publicBaseUrl, setPublicBaseUrl] = useState("https://kreatly.vercel.app");
  const [notionUrl, setNotionUrl] = useState(initialNotionFromQuery);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showSuccessMark, setShowSuccessMark] = useState(false);

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
          try {
            const cacheSnap = await getDocFromCache(ref);
            data = cacheSnap.exists() ? (cacheSnap.data() as Record<string, unknown>) : null;
          } catch {
            data = null;
          }
        }

        if (!data) {
          const localBase = localStorage.getItem("kreatly_public_base_url") || "";
          if (localBase) setPublicBaseUrl(normalizeBaseUrl(localBase));
          return;
        }

        const voice = typeof data.voiceBio === "string" ? String(data.voiceBio) : "";
        if (textRef.current && voice) textRef.current.value = voice;

        const existingNotionUrl = typeof data.notionUrl === "string" ? String(data.notionUrl) : "";
        if (!initialNotionFromQuery && existingNotionUrl && !notionUrl) {
          setNotionUrl(existingNotionUrl);
        }

        const storedBase = typeof data.publicBaseUrl === "string" ? String(data.publicBaseUrl) : "";
        const localBase = localStorage.getItem("kreatly_public_base_url") || "";
        const finalBase = normalizeBaseUrl(storedBase || localBase || publicBaseUrl);
        setPublicBaseUrl(finalBase);
        localStorage.setItem("kreatly_public_base_url", finalBase);
      } catch (err) {
        const localBase = localStorage.getItem("kreatly_public_base_url");
        if (localBase) setPublicBaseUrl(normalizeBaseUrl(localBase));
        setError(err instanceof Error ? err.message : "Failed to load settings.");
      }
    }

    void loadInitialSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, initialNotionFromQuery, notionUrl]);

  async function handleSave() {
    if (!user?.uid) {
      const message = "You must be signed in to save settings.";
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

      setDoc(
        userRef,
        {
          voiceBio,
          publicBaseUrl: normalizedBase,
          notionUrl: notionUrl.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to save in background.";
        setError(message);
        alert(message);
      });

      localStorage.setItem("kreatly_public_base_url", normalizedBase);
      setPublicBaseUrl(normalizedBase);
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save settings.";
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
    textarea.value = textarea.value.slice(0, start) + cleaned + textarea.value.slice(end);
    const nextCursor = start + cleaned.length;
    textarea.setSelectionRange(nextCursor, nextCursor);
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="space-y-8">

        {/* Category cards */}
        <section>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Settings</h1>
          <p className="mt-1 text-[13px] text-zinc-400">
            Configure your Kreatly site — branding, members, and advanced controls.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CategoryCard
              icon={<Globe2 className="h-4 w-4 text-zinc-500" />}
              title="Website"
              description="Navigation, branding, and Voice DNA."
              href="/dashboard/settings/navigation"
            />
            <CategoryCard
              icon={<Users className="h-4 w-4 text-zinc-500" />}
              title="Members"
              description="Team, roles, and member access."
              href="/dashboard/settings/members"
            />
            <CategoryCard
              icon={<SettingsIcon className="h-4 w-4 text-zinc-500" />}
              title="Advanced"
              description="Domains, analytics, and integrations."
              href="/dashboard/settings/advanced"
            />
          </div>
        </section>

        {/* Voice DNA */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Website · Voice
          </p>
          <h2 className="mt-2 text-base font-semibold tracking-tight text-zinc-900">
            Voice DNA & Notion Sync
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
            Paste 3–5 of your best LinkedIn posts or tweets. Our AI will analyze your sentence
            structure, vocabulary, and rhythm to sound exactly like you.
          </p>

          <div className="mt-6">
            <label htmlFor="voice-bio" className="block text-[13px] font-medium text-zinc-700">
              Writing Samples
            </label>
            <textarea
              id="voice-bio"
              rows={10}
              ref={textRef}
              defaultValue=""
              onPaste={handleCleanPaste}
              placeholder="Paste your best writing samples here…"
              className="mt-2 h-64 w-full resize-none rounded-md border border-zinc-200 bg-white p-3.5 text-[13px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-300 transition-colors focus:border-zinc-400 focus:ring-0"
            />
          </div>

          <div className="mt-5">
            <label htmlFor="notion-url" className="block text-[13px] font-medium text-zinc-700">
              Notion Database / Page URL
            </label>
            <input
              id="notion-url"
              type="url"
              value={notionUrl}
              onChange={(e) => setNotionUrl(e.target.value)}
              placeholder="Paste your Notion database or page URL"
              className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300 transition-colors focus:border-zinc-400"
            />
          </div>

          <div className="mt-5">
            <label htmlFor="public-base-url" className="block text-[13px] font-medium text-zinc-700">
              Public Site URL
            </label>
            <input
              id="public-base-url"
              type="url"
              value={publicBaseUrl}
              onChange={(e) => setPublicBaseUrl(e.target.value)}
              placeholder="https://yourdomain.com"
              className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300 transition-colors focus:border-zinc-400"
            />
            <p className="mt-1.5 text-xs text-zinc-400">
              Used for publish links and canonical metadata.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showSuccessMark ? <Check className="h-3.5 w-3.5" /> : null}
              {isSaving ? "Saving…" : "Save settings"}
            </button>
          </div>

          {error ? <p className="mt-4 text-[13px] text-red-500">{error}</p> : null}
        </section>

      </div>

      {showToast ? (
        <div className="fixed right-6 top-6 z-50 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-[13px] font-medium text-zinc-700 shadow-md">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          Settings saved.
        </div>
      ) : null}
    </div>
  );
}

function CategoryCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-100 bg-zinc-50">
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-zinc-900">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
      </div>
    </a>
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
    .replace(/[​-‍﻿]/g, "")
    .replace(/[ --]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}
