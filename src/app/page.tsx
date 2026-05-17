import Link from "next/link";

export default function Home() {
  const features = [
    {
      name: "Blogs",
      description: "Archive every source, draft, and published narrative in one clean timeline.",
    },
    {
      name: "Writer",
      description: "Generate campaign-ready storytelling output from live Notion context.",
    },
    {
      name: "Interviews",
      description: "Turn interviews and raw conversation into structured newsroom-ready copy.",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-zinc-50">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-zinc-950">K</span>
            Kreatly
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {["Platform", "Tools", "Pricing", "Showcase"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm text-zinc-500 transition-colors hover:text-cyan-400"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
            >
              Login
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)] transition hover:border-cyan-400 hover:bg-cyan-500/20"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center lg:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-500">
            Notion-Powered Newsroom OS
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-5xl font-bold leading-[1.06] tracking-[-0.02em] text-zinc-50 sm:text-6xl md:text-7xl">
            Turn Notion into a high-revenue Newsroom OS.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed tracking-[-0.02em] text-zinc-400">
            Draft, automate, and scale your brand voice directly from Notion.
            Built for modern founders who ship.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold tracking-[-0.02em] text-zinc-300">
            $19/month. Half the price of Feather, with 5x the AI distribution power.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.2)] transition hover:border-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_24px_rgba(34,211,238,0.35)]"
            >
              Start your newsroom
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
            >
              View examples
            </a>
          </div>

          <p className="mt-8 text-sm tracking-[-0.02em] text-zinc-600">
            Join 100+ founders and digital agents.
          </p>

          <div className="mx-auto mt-12 w-full max-w-5xl rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">
                Kreatly Dashboard Preview
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="h-24 rounded-lg border border-zinc-800 bg-zinc-900" />
                <div className="h-24 rounded-lg border border-zinc-800 bg-zinc-900" />
                <div className="h-24 rounded-lg border border-zinc-800 bg-zinc-900" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-5xl px-6 pb-20 lg:px-10">
          <div className="border-t border-zinc-800">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="grid grid-cols-[160px_minmax(0,1fr)_36px] items-center gap-4 border-b border-zinc-800 py-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-300">
                  {feature.name}
                </p>
                <p className="text-sm tracking-[-0.02em] text-zinc-500">
                  {feature.description}
                </p>
                <p className="justify-self-end text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-500">
                  GO
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
