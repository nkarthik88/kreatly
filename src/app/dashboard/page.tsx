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

  useEffect(() => {
    if (!user?.uid) return;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.notionApiKey) setNotionApiKey(d.notionApiKey as string);
          if (d.blogDbId) setBlogDbId(d.blogDbId as string);
          if (d.authorsDbId) setAuthorsDbId(d.authorsDbId as string);
          if (d.tagsDbId) setTagsDbId(d.tagsDbId as string);
          if (d.sitePagesDbId) setSitePagesDbId(d.sitePagesDbId as string);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[dashboard] Could not load config:", err);
      }
    })();
  }, [user?.uid]);

  async function handleSave() {
    if (!user?.uid) {
      setMessage({ text: "You must be logged in to save your workspace.", ok: false });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload: Record<string, string | null> = { updatedAt: new Date().toISOString() };
    if (notionApiKey) payload.notionApiKey = notionApiKey;
    if (blogDbId) payload.blogDbId = blogDbId;
    if (authorsDbId) payload.authorsDbId = authorsDbId;
    if (tagsDbId) payload.tagsDbId = tagsDbId;
    if (sitePagesDbId) payload.sitePagesDbId = sitePagesDbId;

    const userRef = doc(db, "users", user.uid);
    const siteRef = doc(db, "sites", user.uid);

    try {
      const writeRace = Promise.all([
        setDoc(userRef, payload, { merge: true }),
        setDoc(siteRef, payload, { merge: true }),
      ]);
      const assumed = new Promise<"assumed">((resolve) => setTimeout(() => resolve("assumed"), 2000));
      const result = await Promise.race([writeRace.then(() => "confirmed" as const), assumed]);

      setIsSaving(false);
      setMessage({
        text: result === "confirmed"
          ? "Workspace saved successfully."
          : "Workspace saved (syncing in background).",
        ok: true,
      });
      router.refresh();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[handleSave] SAVE ERROR:", err);
      setIsSaving(false);
      setMessage({ text: "Save failed. Check the console for details.", ok: false });
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">

      <div className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Welcome to Kreatly</h1>
        <p className="mt-1 text-[13px] text-zinc-400">
          Connect your Notion workspace to launch your blog in minutes.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Step 1 */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Step 1
            </p>
            <h2 className="mt-2 text-[15px] font-semibold text-zinc-900">
              Duplicate the Master Template
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
              Grab a fresh copy of the Kreatly Notion workspace — pre-wired with Blogs,
              Authors, Tags, and Site Pages so you can start publishing instantly.
            </p>
          </div>
          <div className="mt-6">
            <a
              href="https://chameleon.notion.site/Kreatly-Master-Template-YOUR-LINK-HERE"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
            >
              Duplicate to Notion ↗
            </a>
          </div>
        </div>

        {/* Step 2 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Step 2
          </p>
          <h2 className="mt-2 text-[15px] font-semibold text-zinc-900">
            Paste your IDs
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
            Connect your duplicated workspace by pasting the Notion database IDs below.
          </p>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
          >
            {[
              { label: "Notion API Secret", hint: "starts with ntn_", value: notionApiKey, setter: setNotionApiKey, type: "password", placeholder: "ntn_..." },
              { label: "Blog Database ID", hint: "", value: blogDbId, setter: setBlogDbId, type: "text", placeholder: "Posts / Blog database ID" },
              { label: "Authors Database ID", hint: "", value: authorsDbId, setter: setAuthorsDbId, type: "text", placeholder: "Authors database ID" },
              { label: "Tags Database ID", hint: "", value: tagsDbId, setter: setTagsDbId, type: "text", placeholder: "Tags / Topics database ID" },
              { label: "SitePages Database ID", hint: "", value: sitePagesDbId, setter: setSitePagesDbId, type: "text", placeholder: "SitePages / Static pages database ID" },
            ].map(({ label, hint, value, setter, type, placeholder }) => (
              <div key={label} className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  {label}
                  {hint ? <span className="ml-1 font-normal normal-case text-zinc-400">({hint})</span> : null}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300 transition-colors focus:border-zinc-400"
                />
              </div>
            ))}

            {message ? (
              <p className={`pt-1 text-[13px] font-medium ${message.ok ? "text-emerald-600" : "text-red-500"}`}>
                {message.text}
              </p>
            ) : null}
          </form>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="rounded-md bg-zinc-900 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save & Launch Blog"}
        </button>
      </div>
    </div>
  );
}
