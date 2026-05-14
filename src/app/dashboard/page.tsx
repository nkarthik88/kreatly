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

