export default function MeadowPage() {
  return (
    <main className="bg-white px-10 py-10">
      <div className="max-w-6xl">
        <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-black">
          Meadow
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Media Communication hub for trend tracking and audience pulse.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="border border-[#E5E5E5] bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-black">
              Trending Topics
            </h2>
            <ul className="mt-4 space-y-3">
              <li className="border-b border-[#E5E5E5] pb-3 text-sm text-zinc-700">
                AI Distribution Playbooks for Micro-SaaS
              </li>
              <li className="border-b border-[#E5E5E5] pb-3 text-sm text-zinc-700">
                Founder-Led Media Flywheels
              </li>
              <li className="text-sm text-zinc-700">
                Notion-to-Social Publishing Systems
              </li>
            </ul>
          </section>

          <section className="border border-[#E5E5E5] bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-black">
              Community Postings
            </h2>
            <ul className="mt-4 space-y-3">
              <li className="border-b border-[#E5E5E5] pb-3 text-sm text-zinc-700">
                “How are you scaling weekly content without a full media team?”
              </li>
              <li className="border-b border-[#E5E5E5] pb-3 text-sm text-zinc-700">
                “What has worked best for Reddit distribution?”
              </li>
              <li className="text-sm text-zinc-700">
                “Which AI workflow actually drives qualified traffic?”
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
