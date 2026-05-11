"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
  const { user } = useAuth();
  const [voiceBio, setVoiceBio] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadVoiceBio() {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        const value = snapshot.data()?.voiceBio;
        setVoiceBio(typeof value === "string" ? value : "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load Voice DNA.");
      } finally {
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
    };
  }, []);

  async function handleSaveVoiceDna() {
    if (!user?.uid) {
      setError("You must be signed in to save Voice DNA.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          voiceBio: voiceBio.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setShowToast(true);
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setShowToast(false);
      }, 1500);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save Voice DNA.");
    } finally {
      setIsSaving(false);
    }
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
            value={voiceBio}
            onChange={(event) => setVoiceBio(event.target.value)}
            placeholder="Paste your best writing samples here..."
            disabled={isLoading}
            className="mt-3 h-72 w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-500"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSaveVoiceDna()}
          disabled={isSaving || isLoading}
          className="mt-6 rounded-md border border-cyan-400/50 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Voice DNA"}
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
