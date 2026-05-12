"use client";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

const quickStats = [
  { label: "Total Visitors", value: "12,480" },
  { label: "Published Posts", value: "32" },
  { label: "Drafts in Studio", value: "7" },
  { label: "Connected Domains", value: "2" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const name =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "Creator";

  async function handleSyncNow() {
    setIsSyncing(true);
    setToast(null);
    try {
      const response = await fetch("/api/notion/sync", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to connect to Notion.");
      }
      setToast(String(data?.message || "Connection to Notion verified."));
    } catch (err) {
      setToast(
        err instanceof Error ? err.message : "Failed to connect to Notion.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black">
            Welcome back, {name}!
          </h1>
          <p className="text-sm text-zinc-500">
            Your newsroom OS is ready. Here&apos;s a quick snapshot of how your Kreatly
            site is doing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSyncNow()}
          disabled={isSyncing}
          className="h-9 rounded-md border border-sky-600 bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSyncing ? "Syncing your Notion data…" : "Sync Now"}
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {stat.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-black">{stat.value}</p>
          </div>
        ))}
      </section>

      {toast ? (
        <p className="text-xs text-zinc-500">{toast}</p>
      ) : null}
    </div>
  );
}

