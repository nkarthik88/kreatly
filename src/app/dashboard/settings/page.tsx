"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  doc,
  enableNetwork,
  getDocFromServer,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
  const { user } = useAuth();
  const [voiceBioSeed, setVoiceBioSeed] = useState("");
  const [publicBaseUrl, setPublicBaseUrl] = useState("https://kreatly.vercel.app");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const hasEditedRef = useRef(false);
  const voiceBioRef = useRef<HTMLTextAreaElement | null>(null);
  const [showSuccessMark, setShowSuccessMark] = useState(false);
  const loadTimeoutRef = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadVoiceBio() {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      if (loadTimeoutRef.current) {
        window.clearTimeout(loadTimeoutRef.current);
      }
      loadTimeoutRef.current = window.setTimeout(() => {
        setIsLoading(false);
      }, 3000);
      try {
        await enableNetwork(db);
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDocFromServer(userRef);
        const value = snapshot.data()?.voiceBio;
        const storedBaseUrl = snapshot.data()?.publicBaseUrl;
        if (!hasEditedRef.current) {
          const nextValue = typeof value === "string" ? value : "";
          setVoiceBioSeed(nextValue);
          if (voiceBioRef.current) {
            voiceBioRef.current.value = nextValue;
          }
        }
        if (!hasEditedRef.current) {
          if (typeof storedBaseUrl === "string" && storedBaseUrl.trim()) {
            setPublicBaseUrl(storedBaseUrl.trim());
            localStorage.setItem("kreatly_public_base_url", storedBaseUrl.trim());
          } else {
            const localBaseUrl = localStorage.getItem("kreatly_public_base_url");
            if (localBaseUrl?.trim()) {
              setPublicBaseUrl(localBaseUrl.trim());
            }
          }
        }
      } catch {
        const localBaseUrl = localStorage.getItem("kreatly_public_base_url");
        if (localBaseUrl?.trim() && !hasEditedRef.current) {
          setPublicBaseUrl(localBaseUrl.trim());
        }
      } finally {
        if (loadTimeoutRef.current) {
          window.clearTimeout(loadTimeoutRef.current);
        }
        setIsLoading(false);
      }
    }

    void loadVoiceBio();
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      if (loadTimeoutRef.current) {
        window.clearTimeout(loadTimeoutRef.current);
      }
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  async function handleSaveVoiceDna() {
    if (!user?.uid) {
      setError("You must be signed in to save Voice DNA.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setShowSuccessMark(true);
    try {
      await enableNetwork(db);
      const normalizedBaseUrl = normalizeBaseUrl(publicBaseUrl);
      const voiceBioValue = sanitizeVoiceBio(
        voiceBioRef.current?.value ?? voiceBioSeed,
      );
      const userRef = doc(db, "users", user.uid);
      const savePromise = setDoc(
        userRef,
        {
          voiceBio: voiceBioValue,
          publicBaseUrl: normalizedBaseUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(
          () => reject(new Error("Connection slow, but trying in background.")),
          5000,
        );
      });
      await Promise.race([savePromise, timeoutPromise]);
      localStorage.setItem("kreatly_public_base_url", normalizedBaseUrl);
      setPublicBaseUrl(normalizedBaseUrl);

      setShowToast(true);
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowToast(false);
      }, 1500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Connection slow, but trying in background.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCleanPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    const clipboardText = event.clipboardData.getData("text/plain");
    const cleaned = sanitizeVoiceBio(clipboardText);
    const textarea = voiceBioRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const nextValue =
      textarea.value.slice(0, start) + cleaned + textarea.value.slice(end);
    textarea.value = nextValue;
    const nextCursor = start + cleaned.length;
    textarea.setSelectionRange(nextCursor, nextCursor);
    hasEditedRef.current = true;
  }

  return (
    <main className="min-h-screen bg-black px-10 py-10 text-white">
      <div className="pointer-events-auto relative z-10 mx-auto max-w-4xl rounded-xl border border-zinc-800 bg-zinc-950 p-8">
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
            ref={voiceBioRef}
            defaultValue={voiceBioSeed}
            onChange={() => {
              hasEditedRef.current = true;
              if (debounceRef.current) {
                window.clearTimeout(debounceRef.current);
              }
              debounceRef.current = window.setTimeout(() => {
                setVoiceBioSeed(voiceBioRef.current?.value ?? "");
              }, 400);
            }}
            onPaste={handleCleanPaste}
            placeholder="Paste your best writing samples here..."
            disabled={isLoading}
            className="pointer-events-auto mt-3 h-72 w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-500 disabled:cursor-not-allowed"
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
            onChange={(event) => {
              hasEditedRef.current = true;
              setPublicBaseUrl(event.target.value);
            }}
            placeholder="https://yourdomain.com"
            disabled={isLoading}
            className="pointer-events-auto mt-3 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-500 disabled:cursor-not-allowed"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Used for publish links and canonical metadata when posts are published.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSaveVoiceDna()}
          disabled={isSaving || isLoading}
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
