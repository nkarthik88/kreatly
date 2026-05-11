import Link from "next/link";

const stats = [
  { label: "Total Visitors", value: "0", subtitle: "This week" },
  { label: "AI Engine Mentions", value: "0", subtitle: "Perplexity · Gemini · SearchGPT" },
];

export default function HomePage() {
  return (
    <main className="bg-white px-10 py-10">
      <div className="max-w-5xl">
        <section className="border border-[#E5E5E5] bg-white p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Welcome Home
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-black">
            Your Brand New Professionally Designed Blog is Created.
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-600">
            Start from Setup to align Notion fields, then generate distribution-ready
            posts from the Writer with GEO optimization.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/setup"
              className="rounded-[4px] border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-sm font-medium text-white"
            >
              Open Setup
            </Link>
            <Link
              href="/dashboard/blogs"
              className="rounded-[4px] border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Go to Blogs
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {stats.map((item) => (
            <article key={item.label} className="border border-[#E5E5E5] bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-black">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{item.subtitle}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
