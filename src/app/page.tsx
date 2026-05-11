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
    <div className="min-h-screen bg-white text-[#111111]">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-10">
          <div className="text-sm font-semibold tracking-[-0.02em]">Kreatly</div>

          <nav className="hidden items-center gap-8 md:flex">
            {["Platform", "Tools", "Pricing", "Showcase"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm text-zinc-500 transition-colors hover:text-black"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-zinc-500 transition-colors hover:text-black"
            >
              Login
            </Link>
            <Link
              href="/dashboard"
              className="rounded-[4px] bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center lg:px-10">
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.06] tracking-[-0.02em] text-[#111111] sm:text-6xl md:text-7xl">
            Turn Notion into a high-revenue Newsroom OS.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed tracking-[-0.02em] text-[#666666]">
            Draft, automate, and scale your brand voice directly from Notion.
            Built for modern founders who ship.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium tracking-[-0.02em] text-[#111111]">
            $19/month. Half the price of Feather, with 5x the AI distribution power.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-[4px] bg-black px-6 py-3 text-sm font-medium text-white"
            >
              Start your newsroom
            </Link>
            <a
              href="#features"
              className="rounded-[4px] border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-[#111111]"
            >
              View examples
            </a>
          </div>

          <p className="mt-8 text-sm tracking-[-0.02em] text-[#666666]">
            Join 100+ founders and digital agents.
          </p>

          <div className="mx-auto mt-12 w-full max-w-5xl rounded-[4px] border border-zinc-200 bg-zinc-50 p-6">
            <div className="rounded-[4px] border border-zinc-200 bg-white p-6 text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Kreatly Dashboard Preview
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="h-24 rounded-[4px] border border-zinc-200 bg-white" />
                <div className="h-24 rounded-[4px] border border-zinc-200 bg-white" />
                <div className="h-24 rounded-[4px] border border-zinc-200 bg-white" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-5xl px-6 pb-20 lg:px-10">
          <div className="border-t border-zinc-200">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="grid grid-cols-[160px_minmax(0,1fr)_36px] items-center gap-4 border-b border-zinc-200 py-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#111111]">
                  {feature.name}
                </p>
                <p className="text-sm tracking-[-0.02em] text-[#666666]">
                  {feature.description}
                </p>
                <p className="justify-self-end text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
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
