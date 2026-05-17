"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

type Config = {
  notionApiKey: string;
  blogDbId: string;
  authorsDbId: string;
  tagsDbId: string;
  sitePagesDbId: string;
};

type Metrics = {
  total: number;
  published: number;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // null = loading, false = not configured, Config = configured
  const [config, setConfig] = useState<Config | null | false>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  // Form state (only used when not yet configured)
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
          if (d.blogDbId) {
            setConfig({
              notionApiKey: (d.notionApiKey as string) || "",
              blogDbId: d.blogDbId as string,
              authorsDbId: (d.authorsDbId as string) || "",
              tagsDbId: (d.tagsDbId as string) || "",
              sitePagesDbId: (d.sitePagesDbId as string) || "",
            });
            return;
          }
          // Doc exists but no blogDbId yet — prefill any partial fields
          if (d.notionApiKey) setNotionApiKey(d.notionApiKey as string);
          if (d.authorsDbId) setAuthorsDbId(d.authorsDbId as string);
          if (d.tagsDbId) setTagsDbId(d.tagsDbId as string);
          if (d.sitePagesDbId) setSitePagesDbId(d.sitePagesDbId as string);
        }
        setConfig(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[dashboard] Could not load config:", err);
        setConfig(false);
      }
    })();
  }, [user?.uid]);

  // Fetch live post counts once the user is confirmed configured.
  useEffect(() => {
    if (!user?.uid || config === null || config === false) return;
    void (async () => {
      try {
        const [blogsSnap, publishedSnap] = await Promise.all([
          getDocs(collection(db, "blogs")),
          getDocs(query(
            collection(db, "publicPosts"),
            where("siteId", "==", user.uid),
            where("isPublished", "==", true),
          )),
        ]);
        setMetrics({ total: blogsSnap.size, published: publishedSnap.size });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[dashboard] Could not fetch metrics:", err);
        setMetrics({ total: 0, published: 0 });
      }
    })();
  }, [user?.uid, config]);

  async function handleSave() {
    if (!user?.uid) {
      setMessage({ text: "You must be logged in to save your workspace.", ok: false });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload: Record<string, string> = { updatedAt: new Date().toISOString() };
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
      await Promise.race([writeRace.then(() => "confirmed" as const), assumed]);

      setIsSaving(false);
      setMessage({ text: "Workspace saved. Taking you to Content…", ok: true });
      router.push("/dashboard/blogs");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[handleSave] SAVE ERROR:", err);
      setIsSaving(false);
      setMessage({ text: "Save failed. Check the console for details.", ok: false });
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (config === null) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-[13px] text-zinc-400">Loading…</p>
      </div>
    );
  }

  // ── Onboarding (not yet configured) ───────────────────────────────────────
  if (config === false) {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-start justify-center bg-white px-4 py-16">
        <div className="w-full max-w-xl">

          {/* Header */}
          <div className="mb-10 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
              Setup
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
              Connect your Notion workspace
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
              Two quick steps and your blog is live.
            </p>
          </div>

          {/* Step 1 */}
          <div className="relative pl-9">
            <StepNumber n={1} />
            <h2 className="text-[15px] font-semibold text-zinc-900">Duplicate the template</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
              Start with a pre-wired Notion workspace — Blogs, Authors, Tags, and Site Pages
              all ready to go.
            </p>
            <a
              href={process.env.NEXT_PUBLIC_NOTION_TEMPLATE_URL ?? "https://notion.so"}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-[13px] font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
            >
              Open Notion template ↗
            </a>
          </div>

          {/* Divider */}
          <div className="my-8 ml-9 border-t border-zinc-100" />

          {/* Step 2 */}
          <div className="relative pl-9">
            <StepNumber n={2} />
            <h2 className="text-[15px] font-semibold text-zinc-900">Paste your credentials</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
              Copy the IDs from your duplicated workspace and connect them below.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
            >
              {[
                { label: "Notion API Secret", hint: "starts with ntn_", value: notionApiKey, setter: setNotionApiKey, type: "password", placeholder: "ntn_..." },
                { label: "Blog Database ID", hint: "", value: blogDbId, setter: setBlogDbId, type: "text", placeholder: "e.g. 9efe111f…" },
                { label: "Authors Database ID", hint: "", value: authorsDbId, setter: setAuthorsDbId, type: "text", placeholder: "e.g. 35fe111f…" },
                { label: "Tags Database ID", hint: "", value: tagsDbId, setter: setTagsDbId, type: "text", placeholder: "e.g. b8e48cc1…" },
                { label: "SitePages Database ID", hint: "", value: sitePagesDbId, setter: setSitePagesDbId, type: "text", placeholder: "e.g. c7d22ab0…" },
              ].map(({ label, hint, value, setter, type, placeholder }) => (
                <div key={label}>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    {label}
                    {hint ? <span className="ml-1 font-normal normal-case tracking-normal text-zinc-400">({hint})</span> : null}
                  </label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300 transition-colors focus:border-zinc-500 focus:ring-0"
                  />
                </div>
              ))}

              {message ? (
                <p className={`text-[13px] font-medium ${message.ok ? "text-emerald-600" : "text-red-500"}`}>
                  {message.text}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSaving}
                className="mt-2 w-full rounded-md bg-zinc-900 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save & Launch Blog"}
              </button>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // ── Overview dashboard (configured users) ─────────────────────────────────
  return (
    <div className="bg-white text-zinc-900">
      <div className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Overview</h1>
        <p className="mt-1 text-[13px] text-zinc-400">
          Your Kreatly workspace at a glance.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total Posts"
          value={metrics === null ? null : String(metrics.total)}
          hint="All posts synced from Notion"
        />
        <MetricCard
          label="Published"
          value={metrics === null ? null : String(metrics.published)}
          hint="Live on your public blog"
        />
        <MetricCard
          label="Notion Sync"
          value="Connected"
          hint={`DB: ${config.blogDbId.slice(0, 8)}…`}
          accent
        />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Quick actions</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/dashboard/blogs"
            title="Content"
            description="Sync and manage your Notion posts."
          />
          <QuickAction
            href="/dashboard/settings"
            title="Settings"
            description="Update your Voice DNA and site URL."
          />
          <QuickAction
            href="/blog"
            title="View blog ↗"
            description="See your public blog as readers see it."
            external
          />
        </div>
      </div>

      {/* Workspace info */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Workspace</p>
        <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
          {[
            { label: "Blog DB ID", value: config.blogDbId || "—" },
            { label: "Authors DB ID", value: config.authorsDbId || "—" },
            { label: "Tags DB ID", value: config.tagsDbId || "—" },
            { label: "SitePages DB ID", value: config.sitePagesDbId || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-2">
              <dt className="shrink-0 text-zinc-400">{label}</dt>
              <dd className="truncate font-mono text-xs text-zinc-700">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <Link
            href="/dashboard/settings"
            className="text-[13px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
          >
            Edit settings →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-[11px] font-bold text-zinc-500">
      {n}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string | null; // null = loading
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      {value === null ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-zinc-100" />
      ) : (
        <p className={`mt-2 text-2xl font-bold tracking-tight ${accent ? "text-emerald-600" : "text-zinc-900"}`}>
          {value}
        </p>
      )}
      <p className="mt-1 truncate font-mono text-[11px] text-zinc-400">{hint}</p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  external = false,
}: {
  href: string;
  title: string;
  description: string;
  external?: boolean;
}) {
  const cls =
    "flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50";
  const inner = (
    <>
      <p className="text-[13px] font-semibold text-zinc-900">{title}</p>
      <p className="text-xs text-zinc-400">{description}</p>
    </>
  );

  if (external) {
    return <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
  }
  return <Link href={href} className={cls}>{inner}</Link>;
}
