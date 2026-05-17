import Link from "next/link";

const NAV_LINKS = ["Platform", "Tools", "Pricing", "Showcase"];

const features = [
  {
    tag: "Blogs",
    headline: "A living archive for every story you publish.",
    description:
      "Sync your Notion database and surface a polished, SEO-ready blog in minutes. Every property — title, author, tags, date — mapped automatically.",
  },
  {
    tag: "Writer",
    headline: "AI copy tuned to your exact brand voice.",
    description:
      "Generate LinkedIn posts, X threads, and SEO articles from live Notion context. Your Digital Twin learns your style and ships on-brand content at speed.",
  },
  {
    tag: "Interviews",
    headline: "Raw conversation → structured newsroom copy.",
    description:
      "Drop a transcript. Get a structured, publication-ready interview with quotes pulled, narrative shaped, and bylines set — all without leaving Notion.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">

      {/* ── Single Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] w-full max-w-6xl items-center justify-between px-6 lg:px-10">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-zinc-50"
          >
            <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-zinc-950">
              K
            </span>
            Kreatly
          </Link>

          {/* Center nav */}
          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((item) => (
              <a
                key={item}
                href="#"
                className="text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-100"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-200 sm:block"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-cyan-500/50 bg-cyan-500/10 px-4 py-[7px] text-[13px] font-semibold text-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.12)] transition-all hover:border-cyan-400/80 hover:bg-cyan-500/20 hover:shadow-[0_0_22px_rgba(34,211,238,0.25)]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-24 text-center lg:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-500">
            Notion-Powered Newsroom OS
          </p>

          <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-bold leading-[1.05] tracking-[-0.03em] text-zinc-50 sm:text-6xl md:text-[68px]">
            Turn Notion into a&nbsp;high&#8209;revenue Newsroom OS.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500">
            Draft, automate, and scale your brand voice directly from Notion.
            Built for modern founders who ship.
          </p>

          <p className="mx-auto mt-3 text-sm font-semibold text-zinc-400">
            $19/month &mdash; half the price of Feather, with 5× the AI distribution power.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-md border border-cyan-500/50 bg-cyan-500/10 px-7 py-3 text-[13px] font-semibold text-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.2)] transition-all hover:border-cyan-400/80 hover:bg-cyan-500/20 hover:shadow-[0_0_30px_rgba(34,211,238,0.35)]"
            >
              Start your newsroom →
            </Link>
            <a
              href="#features"
              className="rounded-md border border-zinc-800 bg-zinc-900 px-7 py-3 text-[13px] font-medium text-zinc-500 transition-all hover:border-zinc-700 hover:text-zinc-200"
            >
              See what's inside
            </a>
          </div>

          <p className="mt-7 text-xs text-zinc-700">
            Trusted by 100+ founders and creator-led brands.
          </p>

          {/* Dashboard mock */}
          <div className="mx-auto mt-14 w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-1 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-7 py-6 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Kreatly &mdash; Content Dashboard
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {["Blog Posts", "Authors", "Tags"].map((label) => (
                  <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{label}</p>
                    <div className="mt-3 space-y-2">
                      <div className="h-2 w-3/4 rounded-full bg-zinc-800" />
                      <div className="h-2 w-1/2 rounded-full bg-zinc-800" />
                      <div className="h-2 w-2/3 rounded-full bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature rows ──────────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-5xl px-6 pb-32 lg:px-10">
          <div className="mb-10 border-t border-zinc-800" />

          <div className="space-y-0">
            {features.map((feature, i) => (
              <div
                key={feature.tag}
                className={`group grid grid-cols-1 gap-6 border-b border-zinc-800/70 py-10 transition-colors hover:bg-zinc-900/20 md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-start md:gap-10 ${i === 0 ? "" : ""}`}
              >
                {/* Tag */}
                <div className="flex items-center gap-3">
                  <span className="h-px w-5 bg-cyan-500/50" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 group-hover:text-cyan-500 transition-colors">
                    {feature.tag}
                  </p>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-base font-semibold leading-snug text-zinc-100">
                    {feature.headline}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    {feature.description}
                  </p>
                </div>

                {/* CTA arrow */}
                <div className="flex items-start pt-0.5 md:justify-end">
                  <Link
                    href="/dashboard"
                    className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-700 transition-colors group-hover:text-cyan-500"
                  >
                    Explore →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer CTA ────────────────────────────────────────────────── */}
        <section className="border-t border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Ready to build your newsroom?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-500">
            Connect Notion in under 2 minutes. Your first post goes live today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-md border border-cyan-500/50 bg-cyan-500/10 px-8 py-3 text-[13px] font-semibold text-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.2)] transition-all hover:border-cyan-400/80 hover:bg-cyan-500/20 hover:shadow-[0_0_30px_rgba(34,211,238,0.35)]"
            >
              Get started free →
            </Link>
          </div>
          <p className="mt-10 text-xs text-zinc-700">
            © {new Date().getFullYear()} Kreatly. Built with Notion.
          </p>
        </section>

      </main>
    </div>
  );
}
