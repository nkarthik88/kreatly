"use client";

import { useAuth } from "@/context/AuthContext";

const quickStats = [
  { label: "Total Visitors", value: "12,480" },
  { label: "Published Posts", value: "32" },
  { label: "Drafts in Studio", value: "7" },
  { label: "Connected Domains", value: "2" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const name =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "Creator";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-black">
          Welcome back, {name}!
        </h1>
        <p className="text-sm text-zinc-500">
          Your newsroom OS is ready. Here&apos;s a quick snapshot of how your Kreatly
          site is doing.
        </p>
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
    </div>
  );
}

