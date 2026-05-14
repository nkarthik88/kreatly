"use client";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-50 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Kreatly Setup
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            Welcome to Kreatly
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Let&apos;s connect your Notion workspace and launch a beautiful, fully-managed
            newsroom in minutes.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] sm:px-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Step 1
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-50">
                Duplicate the Master Template
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Grab a fresh copy of the Kreatly Notion workspace — pre-wired with Blogs,
                Authors, Tags, and Site Pages so you can start publishing instantly.
              </p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-[999px] border border-zinc-50 bg-zinc-50 px-4 py-2.5 text-sm font-medium tracking-tight text-zinc-950 shadow-sm transition hover:bg-zinc-100 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                Duplicate to Notion
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] sm:px-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Step 2
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-50">
              Paste your IDs
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Connect your duplicated workspace by pasting the IDs from your Notion databases
              below. You can change them anytime later in settings.
            </p>

            <form className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Notion API Secret
                  <span className="ml-1 text-[10px] font-normal normal-case text-zinc-600">
                    (starts with&nbsp;<code className="rounded bg-zinc-800 px-1 py-0.5 text-[10px]">
                      ntn_
                    </code>
                    )
                  </span>
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="ntn_..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Blog Database ID
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="Your Posts / Blog database ID"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Authors Database ID
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="Your Authors database ID"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Tags Database ID
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="Your Tags / Topics database ID"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                  SitePages Database ID
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="Your SitePages / Static pages database ID"
                />
              </div>
            </form>
          </div>
        </section>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[999px] border border-zinc-50 bg-zinc-50 px-6 py-3 text-sm font-semibold tracking-tight text-zinc-950 shadow-sm transition hover:bg-zinc-100 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Save &amp; Launch Blog
          </button>
        </div>
      </div>
    </main>
  );
}

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

