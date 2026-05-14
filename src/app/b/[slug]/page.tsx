import React from "react";
import { Client } from "@notionhq/client";
import { initializeApp, getApp, getApps } from "firebase/app";
import { doc, getDoc, getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// ─── Firebase (server-side) ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyA1ZQYCXHk2NQ9SbF1KfCBw6XvQJCBacb0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "kreatly-1365e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "kreatly-1365e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "kreatly-1365e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "1083279778087",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:1083279778087:web:9c202d5d0762240ef3c902",
};
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

// ─── Types ─────────────────────────────────────────────────────────────────
type PageParams = { params: Promise<{ slug: string }> };

type PostMeta = {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string | null;
  notionPageId: string | null;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Load the published post record + ownerUid credentials from Firestore. */
async function loadPostMeta(slug: string): Promise<PostMeta | null> {
  // eslint-disable-next-line no-console
  console.log("[b/slug] loadPostMeta — slug:", slug);

  const snap = await getDoc(doc(firestore, "publicPosts", slug));
  if (!snap.exists()) {
    // eslint-disable-next-line no-console
    console.log("[b/slug] publicPosts doc not found for slug:", slug);
    return null;
  }

  const d = snap.data();
  // eslint-disable-next-line no-console
  console.log("[b/slug] publicPosts doc:", JSON.stringify({ isPublished: d.isPublished, storyId: d.storyId, title: d.title }));

  if (!d.isPublished) {
    // eslint-disable-next-line no-console
    console.log("[b/slug] post is not published");
    return null;
  }

  return {
    slug,
    title: String(d.title || "Untitled"),
    seoTitle: String(d.seoTitle || d.title || "Untitled"),
    seoDescription: String(d.seoDescription || ""),
    ogImage: typeof d.ogImage === "string" && d.ogImage ? d.ogImage : null,
    notionPageId: typeof d.storyId === "string" && d.storyId ? d.storyId : null,
  };
}

/** Resolve Notion credentials: try per-user Firestore first, fall back to env vars. */
async function resolveNotionCreds(): Promise<{ secret: string; databaseId: string } | null> {
  // Try first doc in `sites` collection (single-tenant — the site owner's config).
  try {
    const sitesSnap = await getDocs(query(collection(firestore, "sites"), limit(1)));
    if (!sitesSnap.empty) {
      const siteData = sitesSnap.docs[0].data();
      const secret = siteData.notionApiKey as string | undefined;
      const databaseId = siteData.blogDbId as string | undefined;
      // eslint-disable-next-line no-console
      console.log("[b/slug] Firestore site creds — notionApiKey present:", Boolean(secret), "| blogDbId:", databaseId ?? "MISSING");
      if (secret && databaseId) return { secret, databaseId };
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[b/slug] Could not read sites collection:", err);
  }

  // Fall back to environment variables.
  const secret = process.env.NOTION_SECRET;
  const databaseId = process.env.NOTION_DATABASE_ID;
  // eslint-disable-next-line no-console
  console.log("[b/slug] Env var creds — NOTION_SECRET present:", Boolean(secret), "| NOTION_DATABASE_ID:", databaseId ?? "MISSING");

  if (!secret || !databaseId) {
    // eslint-disable-next-line no-console
    console.error("[b/slug] ❌ No Notion credentials available. Set NOTION_SECRET + NOTION_DATABASE_ID in Vercel env vars, or save them via the dashboard.");
    return null;
  }

  return { secret, databaseId };
}

/** Fetch all Notion blocks for a page ID, paginating automatically. */
async function fetchBlocks(notion: Client, pageId: string): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined;

  // eslint-disable-next-line no-console
  console.log("[b/slug] fetchBlocks — pageId:", pageId);

  try {
    do {
      const chunk: any = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: cursor,
      });
      blocks.push(...(chunk.results ?? []));
      cursor = chunk.has_more ? (chunk.next_cursor ?? undefined) : undefined;
    } while (cursor);

    // eslint-disable-next-line no-console
    console.log("[b/slug] blocks fetched:", blocks.length, "| types:", [...new Set(blocks.map((b: any) => b.type))]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[b/slug] ❌ blocks.children.list failed:", err);
    throw err;
  }

  return blocks;
}

// ─── Block Renderer ────────────────────────────────────────────────────────

function renderInline(rich: any[] | undefined): React.ReactNode {
  if (!Array.isArray(rich) || rich.length === 0) return null;
  return rich.map((t: any, i: number) => {
    const text: string = t?.plain_text ?? "";
    if (!text) return null;
    const ann = t?.annotations ?? {};
    const href: string | null = t?.href ?? null;

    let node: React.ReactNode = text;
    if (ann.code) node = <code key={i} className="rounded bg-zinc-100 px-1 font-mono text-sm text-zinc-800">{text}</code>;
    if (ann.bold) node = <strong key={i}>{node}</strong>;
    if (ann.italic) node = <em key={i}>{node}</em>;
    if (ann.strikethrough) node = <s key={i}>{node}</s>;
    if (ann.underline) node = <span key={i} className="underline">{node}</span>;
    if (href) node = <a key={i} href={href} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">{node}</a>;
    return <span key={i}>{node}</span>;
  });
}

function renderBlock(block: any): React.ReactNode {
  const type: string = block?.type;
  const value = block?.[type];
  if (!value) return null;

  const rich = Array.isArray(value?.rich_text) ? value.rich_text : undefined;

  switch (type) {
    case "heading_1":
      return <h1 key={block.id} className="mt-10 text-3xl font-bold tracking-tight text-zinc-900">{renderInline(rich)}</h1>;
    case "heading_2":
      return <h2 key={block.id} className="mt-8 text-2xl font-semibold tracking-tight text-zinc-900">{renderInline(rich)}</h2>;
    case "heading_3":
      return <h3 key={block.id} className="mt-6 text-xl font-semibold text-zinc-800">{renderInline(rich)}</h3>;
    case "paragraph": {
      const content = renderInline(rich);
      return <p key={block.id} className="my-4 leading-8 text-zinc-700">{content ?? <br />}</p>;
    }
    case "bulleted_list_item":
      return <li key={block.id} className="ml-6 my-1 list-disc leading-7 text-zinc-700">{renderInline(rich)}</li>;
    case "numbered_list_item":
      return <li key={block.id} className="ml-6 my-1 list-decimal leading-7 text-zinc-700">{renderInline(rich)}</li>;
    case "quote":
      return (
        <blockquote key={block.id} className="my-5 border-l-4 border-zinc-300 pl-5 italic text-zinc-600 leading-7">
          {renderInline(rich)}
        </blockquote>
      );
    case "code": {
      const codeText = Array.isArray(value?.rich_text)
        ? value.rich_text.map((t: any) => t?.plain_text ?? "").join("")
        : "";
      const lang: string = value?.language ?? "";
      return (
        <pre key={block.id} className="my-5 overflow-x-auto rounded-xl bg-zinc-900 px-6 py-5 text-sm text-zinc-100 leading-6">
          <code data-language={lang}>{codeText}</code>
        </pre>
      );
    }
    case "image": {
      const src: string | null = value?.external?.url ?? value?.file?.url ?? null;
      const caption = Array.isArray(value?.caption)
        ? value.caption.map((t: any) => t?.plain_text ?? "").join("").trim()
        : "";
      if (!src) return null;
      return (
        <figure key={block.id} className="my-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={caption || "image"} className="w-full rounded-xl object-cover shadow-sm" />
          {caption ? <figcaption className="mt-2 text-center text-xs text-zinc-500">{caption}</figcaption> : null}
        </figure>
      );
    }
    case "callout": {
      const emoji: string = value?.icon?.emoji ?? "💡";
      return (
        <div key={block.id} className="my-5 flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
          <span className="shrink-0 text-lg">{emoji}</span>
          <p className="leading-7 text-zinc-700">{renderInline(rich)}</p>
        </div>
      );
    }
    case "divider":
      return <hr key={block.id} className="my-10 border-zinc-200" />;
    case "toggle":
      return (
        <details key={block.id} className="my-3 rounded-lg border border-zinc-200 px-4 py-2 cursor-pointer">
          <summary className="font-medium text-zinc-800 select-none">{renderInline(rich)}</summary>
        </details>
      );
    case "video": {
      const videoUrl: string | null = value?.external?.url ?? null;
      if (!videoUrl) return null;
      return (
        <div key={block.id} className="my-6 aspect-video w-full overflow-hidden rounded-xl">
          <iframe src={videoUrl} className="h-full w-full" allowFullScreen title="video" />
        </div>
      );
    }
    default:
      return null;
  }
}

// ─── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPostMeta(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.seoTitle,
    description: post.seoDescription,
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      type: "article",
      images: post.ogImage ? [{ url: post.ogImage }] : [],
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function PublicBlogPostPage({ params }: PageParams) {
  const { slug } = await params;

  const postMeta = await loadPostMeta(slug);
  if (!postMeta) notFound();

  // Determine Notion page ID — prefer storyId stored in Firestore, fall back to resolving via DB query.
  let notionPageId: string | null = postMeta.notionPageId;
  // eslint-disable-next-line no-console
  console.log("[b/slug] notionPageId from Firestore:", notionPageId ?? "NOT STORED");

  let blocks: any[] = [];
  let blocksError: string | null = null;

  const creds = await resolveNotionCreds();

  if (!creds) {
    blocksError = "No Notion credentials configured. Add NOTION_SECRET and NOTION_DATABASE_ID to your Vercel environment variables, or save them via the dashboard.";
  } else {
    const notion = new Client({ auth: creds.secret });

    // If we don't have the page ID yet, query the database to find it by slug.
    if (!notionPageId) {
      // eslint-disable-next-line no-console
      console.log("[b/slug] No storyId in Firestore — querying Notion DB:", creds.databaseId);
      try {
        const dbResp: any = await notion.databases.query({
          database_id: creds.databaseId,
          page_size: 100,
        } as any);
        const match = (dbResp.results ?? []).find((p: any) => {
          const props = p.properties ?? {};
          const titleKey = Object.keys(props).find((k) => props[k]?.type === "title");
          const title = titleKey
            ? (props[titleKey].title ?? []).map((t: any) => t?.plain_text ?? "").join("").trim()
            : "";
          const rawSlug = (props?.Slug?.rich_text ?? []).map((t: any) => t?.plain_text ?? "").join("").trim();
          const computed = (rawSlug || title).toLowerCase().trim()
            .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 120);
          return computed === slug;
        });
        notionPageId = match?.id ?? null;
        // eslint-disable-next-line no-console
        console.log("[b/slug] Notion DB query matched pageId:", notionPageId ?? "NO MATCH");
      } catch (err) {
        blocksError = `Notion database query failed: ${err instanceof Error ? err.message : String(err)}`;
        // eslint-disable-next-line no-console
        console.error("[b/slug] ❌ DB query error:", err);
      }
    }

    if (notionPageId && !blocksError) {
      try {
        blocks = await fetchBlocks(notion, notionPageId);
      } catch (err) {
        blocksError = `Failed to fetch page blocks: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <article className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Kreatly
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl text-zinc-900">
          {postMeta.title}
        </h1>
        {postMeta.seoDescription ? (
          <p className="mt-3 text-base text-zinc-500 leading-7">{postMeta.seoDescription}</p>
        ) : null}

        <div className="my-8 h-px bg-zinc-200" />

        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-10">
          {blocksError ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 font-mono text-xs text-red-700">
              <strong>Content error:</strong> {blocksError}
            </div>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">
              No blocks found. Ensure the Notion page is shared with the integration.
            </p>
          ) : (
            <div className="prose prose-zinc max-w-none">
              {blocks.map((block) => renderBlock(block))}
            </div>
          )}
        </div>
      </article>
    </main>
  );
}
