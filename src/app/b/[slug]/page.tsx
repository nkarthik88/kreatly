import { Client } from "@notionhq/client";
import { initializeApp, getApp, getApps } from "firebase/app";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type BlogParams = {
  params: Promise<{ slug: string }>;
};

type PublicStory = {
  slug: string;
  title: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string | null;
  updatedAt: string | null;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA1ZQYCXHk2NQ9SbF1KfCBw6XvQJCBacb0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kreatly-1365e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kreatly-1365e",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kreatly-1365e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1083279778087",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1083279778087:web:9c202d5d0762240ef3c902",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const publicBaseUrl = "https://kreatly.vercel.app";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, "_");
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function extractRichTextString(property: any): string {
  if (!property) return "";
  if (property?.type === "rich_text" && Array.isArray(property.rich_text)) {
    return property.rich_text.map((t: any) => t?.plain_text || "").join("").trim();
  }
  if (property?.type === "title" && Array.isArray(property.title)) {
    return property.title.map((t: any) => t?.plain_text || "").join("").trim();
  }
  if (property?.type === "formula") {
    return String(property?.formula?.string || "").trim();
  }
  if (property?.type === "url") {
    return String(property?.url || "").trim();
  }
  return "";
}

function extractFirstByKeyMatch(
  properties: Record<string, any>,
  matchers: string[],
): string {
  const entry = Object.entries(properties).find(([key]) => {
    const normalized = normalize(key);
    return matchers.some((matcher) => normalized.includes(matcher));
  });
  return extractRichTextString(entry?.[1]);
}

function extractPlainTextFromBlocks(blocks: any[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const type = block.type;
    const value = (block as any)[type];
    const rich = Array.isArray(value?.rich_text)
      ? value.rich_text
      : type === "table_row" && Array.isArray(value?.cells)
        ? value.cells.flatMap((cell: any) => (Array.isArray(cell) ? cell : []))
        : [];
    const text =
      rich.map((t: any) => t?.plain_text || "").join("") ||
      value?.caption?.map((t: any) => t?.plain_text || "").join("") ||
      value?.title ||
      "";
    if (!text.trim()) continue;

    if (type.startsWith("heading_")) {
      lines.push(text.trim());
    } else if (
      type === "bulleted_list_item" ||
      type === "numbered_list_item" ||
      type === "to_do"
    ) {
      lines.push(`• ${text.trim()}`);
    } else {
      lines.push(text.trim());
    }
  }
  return lines.join("\n\n");
}

async function listAllChildren(notion: Client, blockId: string): Promise<any[]> {
  let hasMore = true;
  let cursor: string | undefined = undefined;
  const all: any[] = [];

  while (hasMore) {
    const response: any = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    });
    all.push(...(response.results ?? []));
    hasMore = Boolean(response.has_more);
    cursor = response.next_cursor ?? undefined;
  }

  return all;
}

async function collectNestedBlocks(notion: Client, blockId: string): Promise<any[]> {
  const children = await listAllChildren(notion, blockId);
  const all = [...children];
  for (const child of children) {
    if (child?.has_children && child?.id) {
      const nested = await collectNestedBlocks(notion, child.id);
      all.push(...nested);
    }
  }
  return all;
}

async function loadFromFirestore(slug: string): Promise<PublicStory | null> {
  try {
    const snapshot = await getDoc(doc(firestore, "publicPosts", slug));
    const data = snapshot.data();
    if (!snapshot.exists() || !data?.isPublished) return null;

    const title = String(data?.title || "Untitled Post");
    const content = String(data?.content || title);
    const seoTitle = String(data?.seoTitle || title);
    const seoDescription = String(data?.seoDescription || content.slice(0, 180));
    const ogImage =
      typeof data?.ogImage === "string" && data.ogImage.trim() ? data.ogImage : null;

    return {
      slug,
      title,
      content,
      seoTitle,
      seoDescription,
      ogImage,
      updatedAt: null,
    };
  } catch {
    return null;
  }
}

async function loadFromNotion(slug: string): Promise<PublicStory | null> {
  try {
    const secret = process.env.NOTION_SECRET;
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!secret || !databaseId) return null;

    const notion = new Client({ auth: secret });
    let response: any;
    try {
      response = await notion.dataSources.query({
        data_source_id: databaseId,
        page_size: 100,
        sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
      });
    } catch {
      const database: any = await notion.databases.retrieve({ database_id: databaseId });
      const dataSourceId = database?.data_sources?.[0]?.id;
      if (!dataSourceId) return null;
      response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
      });
    }

    for (const page of response.results ?? []) {
      const properties = page?.properties ?? {};
      const propEntries = Object.values(properties) as any[];
      const title =
        properties.Name?.title?.[0]?.plain_text ||
        properties.title?.title?.[0]?.plain_text ||
        properties.Name?.rich_text?.[0]?.plain_text ||
        "Untitled Post";
      const slugFromProperty = extractFirstByKeyMatch(properties, ["slug"]);
      const computedSlug = toSlug(slugFromProperty || title || page.id);
      if (computedSlug !== slug) continue;

      const statusProp = propEntries.find(
        (prop) =>
          prop?.type === "status" || prop?.type === "select" || prop?.type === "checkbox",
      );
      const statusValue =
        statusProp?.type === "status"
          ? statusProp?.status?.name || "Draft"
          : statusProp?.type === "select"
            ? statusProp?.select?.name || "Draft"
            : statusProp?.type === "checkbox"
              ? statusProp?.checkbox
                ? "Published"
                : "Draft"
              : extractFirstByKeyMatch(properties, ["publish_status", "status"]);
      const isPublished = String(statusValue).toLowerCase().includes("publish");
      if (!isPublished) return null;

      const blocks = await collectNestedBlocks(notion, page.id);
      const content = extractPlainTextFromBlocks(blocks) || title;
      const seoTitle = extractFirstByKeyMatch(properties, ["seo_title", "meta_title"]) || title;
      const seoDescription =
        extractFirstByKeyMatch(properties, ["seo_description", "meta_description", "description"]) ||
        content.slice(0, 180);
      const ogImage = extractFirstByKeyMatch(properties, ["og_image", "open_graph", "social_image"]);

      return {
        slug,
        title,
        content,
        seoTitle,
        seoDescription,
        ogImage: ogImage || null,
        updatedAt: page?.last_edited_time || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function loadStoryBySlug(slug: string): Promise<PublicStory | null> {
  const fireStory = await loadFromFirestore(slug);
  if (fireStory) return fireStory;
  return loadFromNotion(slug);
}

export async function generateMetadata({ params }: BlogParams): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadStoryBySlug(slug);
  if (!post) {
    return {
      title: "Post Not Found | Kreatly",
      description: "This post is not available.",
    };
  }

  const canonical = `${publicBaseUrl}/b/${post.slug}`;
  const image = post.ogImage || `${publicBaseUrl}/og-default.png`;

  return {
    title: post.seoTitle,
    description: post.seoDescription,
    alternates: { canonical },
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      url: canonical,
      siteName: "Kreatly",
      type: "article",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle,
      description: post.seoDescription,
      images: [image],
    },
  };
}

export default async function PublicBlogPostPage({ params }: BlogParams) {
  const { slug } = await params;
  const post = await loadStoryBySlug(slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <article className="mx-auto max-w-4xl rounded-2xl border border-zinc-200/80 bg-white/95 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Kreatly Publishing
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {post.seoDescription}
        </p>
        {post.updatedAt ? (
          <p className="mt-3 text-xs text-zinc-500">
            Updated {new Date(post.updatedAt).toLocaleDateString()}
          </p>
        ) : null}
        <div className="my-8 h-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="whitespace-pre-wrap text-base leading-8 text-zinc-800 dark:text-zinc-200">
          {post.content}
        </div>
      </article>
    </main>
  );
}
