"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Config = {
  notionApiKey: string;
  blogDbId: string;
  authorsDbId: string;
  tagsDbId: string;
  sitePagesDbId: string;
};

type Metrics = { total: number; published: number };

type WizardTab = "content" | "pages" | "tags" | "authors";

const TABS: { id: WizardTab; label: string; field: keyof Pick<Config, "blogDbId" | "authorsDbId" | "tagsDbId" | "sitePagesDbId">; placeholder: string }[] = [
  { id: "content",  label: "Content",  field: "blogDbId",      placeholder: "e.g. 9efe111fb3bd82af8a8a0111beb8fb73" },
  { id: "pages",    label: "Pages",    field: "sitePagesDbId", placeholder: "e.g. b8e48cc16d884cb4b2f6656accc6abfc" },
  { id: "tags",     label: "Tags",     field: "tagsDbId",      placeholder: "e.g. 35fe111fb3bd804cb475c4adaa32d987" },
  { id: "authors",  label: "Authors",  field: "authorsDbId",   placeholder: "e.g. c7d22ab0fc3e4a1b88dc9f0e12345678" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // null = still loading from Firestore, false = not yet configured, Config = ready
  const [config, setConfig] = useState<Config | null | false>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  // ── Shared form state (written on Finish) ──────────────────────────────────
  const [notionApiKey, setNotionApiKey] = useState("");
  const [blogDbId,      setBlogDbId]      = useState("");
  const [authorsDbId,   setAuthorsDbId]   = useState("");
  const [tagsDbId,      setTagsDbId]      = useState("");
  const [sitePagesDbId, setSitePagesDbId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = useState<WizardTab>("content");
  // tracks which tabs have been "connected" (validated)
  const [connected, setConnected] = useState<Partial<Record<WizardTab, boolean>>>({});
  const [validating, setValidating] = useState(false);
  // step 3 fields
  const [blogName,   setBlogName]   = useState("");
  const [subdomain,  setSubdomain]  = useState("");

  // per-tab input refs so we can read current values without re-render lag
  const tabValues = { content: blogDbId, pages: sitePagesDbId, tags: tagsDbId, authors: authorsDbId };
  const tabSetters: Record<WizardTab, (v: string) => void> = {
    content: setBlogDbId,
    pages:   setSitePagesDbId,
    tags:    setTagsDbId,
    authors: setAuthorsDbId,
  };

  // ── Load existing config on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          // Accept both naming conventions (legacy: blogDatabaseId, current: blogDbId)
          const resolvedBlogDbId =
            (d.blogDbId as string | undefined) || (d.blogDatabaseId as string | undefined) || "";
          if (resolvedBlogDbId) {
            setConfig({
              notionApiKey: (d.notionApiKey as string) || "",
              blogDbId: resolvedBlogDbId,
              authorsDbId:
                (d.authorsDbId as string | undefined) || (d.authorsDatabaseId as string | undefined) || "",
              tagsDbId:
                (d.tagsDbId as string | undefined) || (d.tagsDatabaseId as string | undefined) || "",
              sitePagesDbId:
                (d.sitePagesDbId as string | undefined) || (d.sitePagesDatabaseId as string | undefined) || "",
            });
            return;
          }
          // Partial data — prefill form fields
          if (d.notionApiKey) setNotionApiKey(d.notionApiKey as string);
          const sa = (d.authorsDbId || d.authorsDatabaseId) as string | undefined;
          const st = (d.tagsDbId    || d.tagsDatabaseId)    as string | undefined;
          const sp = (d.sitePagesDbId || d.sitePagesDatabaseId) as string | undefined;
          if (sa) setAuthorsDbId(sa);
          if (st) setTagsDbId(st);
          if (sp) setSitePagesDbId(sp);
        }
        setConfig(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[dashboard] Could not load config:", err);
        setConfig(false);
      }
    })();
  }, [user?.uid]);

  // ── Fetch live counts once configured ─────────────────────────────────────
  useEffect(() => {
    if (!user?.uid || config === null || config === false) return;
    void (async () => {
      try {
        const [blogsSnap, publishedSnap] = await Promise.all([
          getDocs(collection(db, "blogs")),
          getDocs(query(collection(db, "publicPosts"), where("siteId", "==", user.uid), where("isPublished", "==", true))),
        ]);
        setMetrics({ total: blogsSnap.size, published: publishedSnap.size });
      } catch {
        setMetrics({ total: 0, published: 0 });
      }
    })();
  }, [user?.uid, config]);

  // ── "Connect database" — simulate quick validation then mark tab done ──────
  async function handleConnect(tab: WizardTab) {
    const value = tabValues[tab].trim();
    if (!value) return;
    setValidating(true);
    await new Promise((r) => setTimeout(r, 600));
    setValidating(false);
    setConnected((prev) => ({ ...prev, [tab]: true }));
  }

  // ── Final save (Step 3 Finish) ─────────────────────────────────────────────
  async function handleFinish() {
    if (!user?.uid) return;
    setIsSaving(true);
    setSaveError(null);

    const payload: Record<string, string> = {
      updatedAt: new Date().toISOString(),
      blogName:  blogName.trim(),
      subdomain: subdomain.trim().toLowerCase(),
    };
    if (notionApiKey) payload.notionApiKey = notionApiKey;
    if (blogDbId)      payload.blogDbId      = blogDbId;
    if (authorsDbId)   payload.authorsDbId   = authorsDbId;
    if (tagsDbId)      payload.tagsDbId      = tagsDbId;
    if (sitePagesDbId) payload.sitePagesDbId = sitePagesDbId;

    try {
      await Promise.all([
        setDoc(doc(db, "users", user.uid), payload, { merge: true }),
        setDoc(doc(db, "sites", user.uid), payload, { merge: true }),
      ]);
      setIsSaving(false);
      router.push("/dashboard/blogs");
    } catch (err) {
      setIsSaving(false);
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (config === null) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-[13px] text-zinc-400">Loading…</p>
      </div>
    );
  }

  // ── Onboarding wizard ────────────────────────────────────────────────────────
  if (config === false) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] items-start justify-center bg-white pt-14 pb-20 px-4">
        <div className="w-full max-w-lg">

          {/* ── Step indicator ── */}
          <div className="mb-10 flex items-center justify-center gap-2">
            {([1, 2, 3] as const).map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
                  step === n
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : step > n
                    ? "border-zinc-900 bg-white text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-400"
                }`}>
                  {step > n ? "✓" : n}
                </div>
                {n < 3 && <div className={`h-px w-10 transition-colors ${step > n ? "bg-zinc-900" : "bg-zinc-200"}`} />}
              </div>
            ))}
          </div>

          {/* ════════════════════ STEP 1 ════════════════════ */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Create content with Notion
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                Bring your own databases or duplicate our databases.
              </p>

              {/* Duplicate button */}
              <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
                <p className="text-[13px] font-semibold text-zinc-900">Start from our template</p>
                <p className="mt-1 text-[13px] text-zinc-500">
                  A ready-made Notion workspace with Blogs, Authors, Tags, and Pages pre-configured.
                </p>
                <a
                  href={process.env.NEXT_PUBLIC_NOTION_TEMPLATE_URL ?? "https://notion.so"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-[13px] font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
                >
                  Duplicate Databases ↗
                </a>
              </div>

              {/* API key */}
              <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-6">
                <label htmlFor="api-key" className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Notion API Secret
                  <span className="ml-1 font-normal normal-case tracking-normal text-zinc-400">(starts with ntn_)</span>
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                  placeholder="ntn_..."
                  className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300 transition-colors focus:border-zinc-500"
                />
                <p className="mt-2 text-xs text-zinc-400">
                  Found at <span className="font-medium text-zinc-600">notion.so → Settings → Integrations → New integration</span>
                </p>
              </div>

              {/* Nav */}
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-md bg-zinc-900 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════ STEP 2 ════════════════════ */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Map the fields to Notion properties
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                Connect each of your Notion databases to Kreatly.
              </p>

              {/* Tab bar */}
              <div className="mt-7 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 rounded-md py-1.5 text-[13px] font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    {tab.label}
                    {connected[tab.id] && (
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab panel */}
              {TABS.map((tab) => tab.id === activeTab && (
                <div key={tab.id} className="mt-4 rounded-xl border border-zinc-200 bg-white p-6">
                  <label className="block text-[13px] font-semibold text-zinc-900">
                    {tab.label} Database URL
                    <span className="ml-1 text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={tabValues[tab.id]}
                    onChange={(e) => tabSetters[tab.id](e.target.value)}
                    placeholder={tab.placeholder}
                    className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300 transition-colors focus:border-zinc-500"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!tabValues[tab.id].trim() || validating}
                      onClick={() => void handleConnect(tab.id)}
                      className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-[13px] font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {validating ? "Validating…" : "Connect database"}
                    </button>
                    {connected[tab.id] && (
                      <span className="text-[13px] font-medium text-emerald-600">✓ Connected</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Nav */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!blogDbId.trim()}
                  className="rounded-md bg-zinc-900 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
              {!blogDbId.trim() && (
                <p className="mt-2 text-right text-xs text-zinc-400">Connect the Content database to continue.</p>
              )}
            </div>
          )}

          {/* ════════════════════ STEP 3 ════════════════════ */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                You&apos;re all set to go!
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                Choose a name for your blog and a subdomain.
              </p>

              <div className="mt-7 space-y-4">
                {/* Blog name */}
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <label htmlFor="blog-name" className="block text-[13px] font-semibold text-zinc-900">
                    Blog name
                  </label>
                  <input
                    id="blog-name"
                    type="text"
                    value={blogName}
                    onChange={(e) => setBlogName(e.target.value)}
                    placeholder="e.g. Bhanu's Personal Blog"
                    className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300 transition-colors focus:border-zinc-500"
                  />
                </div>

                {/* Subdomain */}
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <label htmlFor="subdomain" className="block text-[13px] font-semibold text-zinc-900">
                    Subdomain
                  </label>
                  <div className="mt-2 flex items-center rounded-md border border-zinc-200 bg-white focus-within:border-zinc-500 transition-colors overflow-hidden">
                    <input
                      id="subdomain"
                      type="text"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="your-name"
                      className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-300"
                    />
                    <span className="shrink-0 border-l border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 select-none">
                      .kreatly.blog
                    </span>
                  </div>
                </div>
              </div>

              {saveError && (
                <p className="mt-4 text-[13px] text-red-500">{saveError}</p>
              )}

              {/* Nav */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[13px] font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={isSaving || !blogDbId.trim()}
                  className="rounded-md bg-zinc-900 px-8 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Finish →"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── Overview (configured users) ──────────────────────────────────────────────
  return (
    <div className="bg-white text-zinc-900">
      <div className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Overview</h1>
        <p className="mt-1 text-[13px] text-zinc-400">Your Kreatly workspace at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Posts"  value={metrics === null ? null : String(metrics.total)}     hint="All posts synced from Notion" />
        <MetricCard label="Published"    value={metrics === null ? null : String(metrics.published)} hint="Live on your public blog" />
        <MetricCard label="Notion Sync"  value="Connected" hint={`DB: ${config.blogDbId.slice(0, 8)}…`} accent />
      </div>

      <div className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Quick actions</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction href="/dashboard/blogs"   title="Content"      description="Sync and manage your Notion posts." />
          <QuickAction href="/dashboard/settings" title="Settings"    description="Update your Voice DNA and site URL." />
          <QuickAction href="/blog"               title="View blog ↗" description="See your public blog as readers see it." external />
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Workspace</p>
        <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
          {[
            { label: "Blog DB ID",      value: config.blogDbId      || "—" },
            { label: "Authors DB ID",   value: config.authorsDbId   || "—" },
            { label: "Tags DB ID",      value: config.tagsDbId      || "—" },
            { label: "SitePages DB ID", value: config.sitePagesDbId || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-2">
              <dt className="shrink-0 text-zinc-400">{label}</dt>
              <dd className="truncate font-mono text-xs text-zinc-700">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <Link href="/dashboard/settings" className="text-[13px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline">
            Edit settings →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, hint, accent = false }: {
  label: string; value: string | null; hint: string; accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      {value === null
        ? <div className="mt-2 h-8 w-16 animate-pulse rounded-md bg-zinc-100" />
        : <p className={`mt-2 text-2xl font-bold tracking-tight ${accent ? "text-emerald-600" : "text-zinc-900"}`}>{value}</p>
      }
      <p className="mt-1 truncate font-mono text-[11px] text-zinc-400">{hint}</p>
    </div>
  );
}

function QuickAction({ href, title, description, external = false }: {
  href: string; title: string; description: string; external?: boolean;
}) {
  const cls = "flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50";
  const inner = (
    <>
      <p className="text-[13px] font-semibold text-zinc-900">{title}</p>
      <p className="text-xs text-zinc-400">{description}</p>
    </>
  );
  return external
    ? <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
    : <Link href={href} className={cls}>{inner}</Link>;
}
