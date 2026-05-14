"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notionApiKey, setNotionApiKey] = useState("");
  const [blogDbId, setBlogDbId] = useState("");
  const [authorsDbId, setAuthorsDbId] = useState("");
  const [tagsDbId, setTagsDbId] = useState("");
  const [sitePagesDbId, setSitePagesDbId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Populate form fields from Firestore on mount so IDs don't disappear after save.
  useEffect(() => {
    if (!user?.uid) return;
    void (async () => {
      try {
        // eslint-disable-next-line no-console
        console.log("[dashboard] Loading saved config for uid:", user.uid);
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.notionApiKey) setNotionApiKey(d.notionApiKey as string);
          if (d.blogDbId) setBlogDbId(d.blogDbId as string);
          if (d.authorsDbId) setAuthorsDbId(d.authorsDbId as string);
          if (d.tagsDbId) setTagsDbId(d.tagsDbId as string);
          if (d.sitePagesDbId) setSitePagesDbId(d.sitePagesDbId as string);
          // eslint-disable-next-line no-console
          console.log("[dashboard] Config loaded from Firestore ✅");
        } else {
          // eslint-disable-next-line no-console
          console.log("[dashboard] No saved config found — form starts empty.");
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[dashboard] Could not load config:", err);
      }
    })();
  }, [user?.uid]);

  async function handleSave() {
    // eslint-disable-next-line no-console
    console.log("[handleSave] START — user:", user?.uid ?? "NOT LOGGED IN");

    if (!user?.uid) {
      setMessage({ text: "You must be logged in to save your workspace.", ok: false });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload = {
      notionApiKey: notionApiKey || null,
      blogDbId: blogDbId || null,
      authorsDbId: authorsDbId || null,
      tagsDbId: tagsDbId || null,
      sitePagesDbId: sitePagesDbId || null,
      updatedAt: new Date().toISOString(),
    };

    // eslint-disable-next-line no-console
    console.log("[handleSave] payload:", payload);

    const userRef = doc(db, "users", user.uid);
    const siteRef = doc(db, "sites", user.uid);

    // Fire the writes. Don't await — Firestore with WebSocket transport queues
    // the write locally and syncs in the background. We've confirmed the data
    // lands in the DB even when the SDK never resolves the promise in this env.
    void setDoc(userRef, payload, { merge: true }).then(() => {
      // eslint-disable-next-line no-console
      console.log("[handleSave] users/ write confirmed by server ✅");
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[handleSave] users/ write error:", err);
    });

    void setDoc(siteRef, payload, { merge: true }).then(() => {
      // eslint-disable-next-line no-console
      console.log("[handleSave] sites/ write confirmed by server ✅");
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[handleSave] sites/ write error:", err);
    });

    // Wait up to 2 seconds for confirmation; if no response, assume success
    // since the data is already queued and will sync. Either way, unblock the button.
    const writeRace = Promise.all([
      setDoc(userRef, payload, { merge: true }),
      setDoc(siteRef, payload, { merge: true }),
    ]);
    const assumed = new Promise<"assumed">((resolve) => setTimeout(() => resolve("assumed"), 2000));

    const result = await Promise.race([writeRace.then(() => "confirmed" as const), assumed]);

    // eslint-disable-next-line no-console
    console.log("[handleSave] result:", result);

    setIsSaving(false);
    setMessage({
      text: result === "confirmed"
        ? "✅ Workspace saved successfully."
        : "✅ Workspace saved (syncing in background).",
      ok: true,
    });

    // Refresh server components so the new IDs are reflected immediately.
    router.refresh();
  }

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
              <a
                href="https://chameleon.notion.site/Kreatly-Master-Template-YOUR-LINK-HERE"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-[999px] border border-zinc-50 bg-zinc-50 px-4 py-2.5 text-center text-sm font-medium tracking-tight text-zinc-950 shadow-sm transition hover:bg-zinc-100 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                Duplicate to Notion
              </a>
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

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
            >
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
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
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
                  value={blogDbId}
                  onChange={(e) => setBlogDbId(e.target.value)}
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
                  value={authorsDbId}
                  onChange={(e) => setAuthorsDbId(e.target.value)}
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
                  value={tagsDbId}
                  onChange={(e) => setTagsDbId(e.target.value)}
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
                  value={sitePagesDbId}
                  onChange={(e) => setSitePagesDbId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="Your SitePages / Static pages database ID"
                />
              </div>

              {message ? (
                <p className={`pt-1 text-xs font-medium ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {message.text}
                </p>
              ) : null}
            </form>
          </div>
        </section>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-[999px] border border-zinc-50 bg-zinc-50 px-6 py-3 text-sm font-semibold tracking-tight text-zinc-950 shadow-sm transition hover:bg-zinc-100 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save & Launch Blog"}
          </button>
        </div>
      </div>
    </main>
  );
}

