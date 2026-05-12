"use client";

import { ArrowDownRight, ArrowUpRight, Clock3, MousePointer2, Users } from "lucide-react";

const topPages = [
  { title: "/blog/how-to-launch-ai-newsroom", views: 1480 },
  { title: "/blog/voice-dna-guide", views: 986 },
  { title: "/blog/product-updates", views: 732 },
];

const topReferrers = [
  { source: "linkedin.com", visits: 820 },
  { source: "twitter.com", visits: 540 },
  { source: "google.com", visits: 390 },
];

const topCountries = [
  { country: "United States", views: 6200 },
  { country: "India", views: 3100 },
  { country: "United Kingdom", views: 1400 },
  { country: "Germany", views: 900 },
  { country: "Canada", views: 780 },
];

const browsers = [
  { label: "Chrome", value: "62%" },
  { label: "Safari", value: "24%" },
  { label: "Firefox", value: "8%" },
  { label: "Edge", value: "6%" },
];

const devices = [
  { label: "Desktop", value: "68%" },
  { label: "Mobile", value: "29%" },
  { label: "Tablet", value: "3%" },
];

export default function AnalyticsPage() {
  return (
    <main className="bg-white px-10 py-10 text-black">
      <div className="mx-auto max-w-[1000px] space-y-8">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Analytics
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Live performance overview
          </h1>
          <p className="text-sm text-zinc-500">
            Lightweight, always-on analytics tuned for your Kreatly-powered newsroom.
          </p>
        </header>

        {/* Top stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Views (last 7 days)"
            value="18,420"
            change="+12.4%"
            trend="up"
            icon={<MousePointer2 className="h-4 w-4 text-sky-600" />}
          />
          <StatCard
            label="Visitors"
            value="9,880"
            change="+8.1%"
            trend="up"
            icon={<Users className="h-4 w-4 text-emerald-600" />}
          />
          <StatCard
            label="Bounce rate"
            value="28.5%"
            change="-3.2%"
            trend="down"
            icon={<ArrowDownRight className="h-4 w-4 text-rose-500" />}
          />
          <StatCard
            label="Avg. time on site"
            value="3m 24s"
            change="+0.9s"
            trend="up"
            icon={<Clock3 className="h-4 w-4 text-indigo-600" />}
          />
        </section>

        {/* World map + countries */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-black">
                Traffic by location
              </h2>
              <p className="text-xs text-zinc-500">Live · last 30 days</p>
            </div>
            <div className="mt-4 flex h-[260px] items-center justify-center rounded-lg bg-gradient-to-br from-zinc-50 to-zinc-100">
              <p className="text-xs text-zinc-500">
                World map heatmap placeholder (hook up to your analytics source)
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold tracking-tight text-black">Top countries</h2>
            <div className="mt-4 space-y-2">
              {topCountries.map((row) => (
                <div
                  key={row.country}
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-xs"
                >
                  <p className="font-medium text-zinc-800">{row.country}</p>
                  <p className="font-mono text-zinc-600">{row.views.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom tables */}
        <section className="grid gap-4 md:grid-cols-2">
          <MiniTable
            title="Top pages"
            rows={topPages.map((p) => ({
              label: p.title,
              value: `${p.views.toLocaleString()} views`,
            }))}
          />
          <MiniTable
            title="Top referrers"
            rows={topReferrers.map((r) => ({
              label: r.source,
              value: `${r.visits.toLocaleString()} visits`,
            }))}
          />
          <MiniTable
            title="Browsers & OS"
            rows={browsers}
          />
          <MiniTable
            title="Devices"
            rows={devices}
          />
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  change,
  trend,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ReactNode;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;
  const trendColor =
    trend === "up" ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50";

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {label}
          </p>
          <p className="mt-3 text-2xl font-semibold text-black">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100">
          {icon}
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[11px] font-medium">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${trendColor}`}>
          <TrendIcon className="h-3 w-3" />
          {change}
        </span>
        <span className="text-zinc-500">vs. previous period</span>
      </div>
    </div>
  );
}

function MiniTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight text-black">{title}</h2>
      <div className="mt-3 space-y-2 text-xs">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2"
          >
            <p className="truncate text-zinc-700">{row.label}</p>
            <p className="font-mono text-zinc-600">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

