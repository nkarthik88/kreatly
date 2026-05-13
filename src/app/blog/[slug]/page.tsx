import { Client } from "@notionhq/client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageParams = {
  params: Promise<{ slug: string }>;
};

type NotionPost = {
  id: string;
  title: string;
  slug: string;
  date: string | null;
  blocks: any[];
};

const NOTION_STATUS_PUBLISHED = "Published";

async function getNotionClient() {
  const secret = process.env.NOTION_SECRET;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!secret || !databaseId) {
    throw new Error("Missing NOTION_SECRET or NOTION_DATABASE_ID");
  }

  return { notion: new Client({ auth: secret }), databaseId };
}

async function fetchPostBySlug(slug: string): Promise<NotionPost | null> {
  const { notion, databaseId } = await getNotionClient();

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: "Slug",
          rich_text: { equals: slug },
        },
        {
          property: "Status",
          // Works for both select and status types in Notion
          status: { equals: NOTION_STATUS_PUBLISHED } as any,
        },
      ],
    },
    page_size: 1,
  } as any);

  const page: any | undefined = response.results?.[0];
  if (!page) return null;

  const properties = page.properties || {};
  const titleProp: any = properties?.Name || properties?.Title || {};
  const title =
    (Array.isArray(titleProp?.title)
      ? titleProp.title.map((t: any) => t?.plain_text || "").join("").trim()
      : "") || "Untitled";

  const date =
    properties?.Date?.date?.start ||
    (typeof page.last_edited_time === "string" ? page.last_edited_time : null);

  const blocks: any[] = [];
  let cursor: string | undefined;
  do {
    const chunk: any = await notion.blocks.children.list({
      block_id: page.id,
      page_size: 100,
      start_cursor: cursor,
    });
    blocks.push(...(chunk.results ?? []));
    cursor = chunk.has_more ? chunk.next_cursor ?? undefined : undefined;
  } while (cursor);

  return {
    id: page.id,
    title,
    slug,
    date,
    blocks,
  };
}

function renderRichText(rich: any[] | undefined): string {
  if (!Array.isArray(rich)) return "";
  return rich.map((t: any) => t?.plain_text || "").join("");
}

function renderBlock(block: any) {
  const type = block.type;
  const value = block[type];

  switch (type) {
    case "heading_1":
      return (
        <h1 key={block.id} className="mt-8">
          {renderRichText(value?.rich_text)}
        </h1>
      );
    case "heading_2":
      return (
        <h2 key={block.id} className="mt-8">
          {renderRichText(value?.rich_text)}
        </h2>
      );
    case "heading_3":
      return (
        <h3 key={block.id} className="mt-6">
          {renderRichText(value?.rich_text)}
        </h3>
      );
    case "paragraph":
      return (
        <p key={block.id}>
          {renderRichText(value?.rich_text)}
        </p>
      );
    case "bulleted_list_item":
      return (
        <li key={block.id} className="list-disc">
          {renderRichText(value?.rich_text)}
        </li>
      );
    case "numbered_list_item":
      return (
        <li key={block.id} className="list-decimal">
          {renderRichText(value?.rich_text)}
        </li>
      );
    case "quote":
      return (
        <blockquote key={block.id}>
          {renderRichText(value?.rich_text)}
        </blockquote>
      );
    default:
      return null;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await fetchPostBySlug(slug);
    if (!post) {
      return {
        title: "Post not found",
        description: "This article is not published or does not exist.",
      };
    }

    return {
      title: post.title,
      description: `Read ${post.title} on Kreatly.`,
    };
  } catch {
    return {
      title: "Post not available",
      description: "This article is not available.",
    };
  }
}

export default async function BlogReaderPage({ params }: PageParams) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const formattedDate =
    post.date &&
    new Date(post.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Kreatly Blog
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          {post.title}
        </h1>
        {formattedDate ? (
          <p className="mt-2 text-sm text-zinc-500">
            {formattedDate}
          </p>
        ) : null}

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-10">
          <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-p:text-zinc-700 prose-a:text-sky-600 prose-a:no-underline hover:prose-a:underline prose-li:my-1">
            {post.blocks.map((block) => renderBlock(block))}
          </div>
        </div>
      </article>
    </main>
  );
}


type BlogPageParams = {
  params: Promise<{ slug: string }>;
};

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

function extractPlainTextFromBlocks(blocks: any[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const type = block.type;
    const value = (block as any)[type];
    const rich = value?.rich_text;
    if (!Array.isArray(rich)) continue;
    const text = rich.map((t: any) => t.plain_text).join("");
    if (!text.trim()) continue;
    lines.push(text.trim());
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

async function loadPublishedStoryBySlug(slug: string) {
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
      const database: any = await notion.databases.retrieve({
        database_id: databaseId,
      });
      const dataSourceId = database?.data_sources?.[0]?.id;
      if (!dataSourceId) return null;
      response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
      });
    }

    for (const page of response.results ?? []) {
      const props = page.properties ?? {};
      const entries = Object.entries(props) as [string, any][];
      const titleProp = entries.find(([, v]) => v?.type === "title")?.[1];
      const title =
        titleProp?.title?.map((t: any) => t?.plain_text || "").join("") || "Untitled";
      const slugProp = entries.find(([k]) => normalize(k).includes("slug"))?.[1];
      const slugValue =
        slugProp?.type === "rich_text"
          ? (slugProp.rich_text ?? []).map((t: any) => t?.plain_text || "").join("")
          : "";
      const computedSlug = toSlug((slugValue || title).trim());
      if (computedSlug !== slug) continue;

      const statusProp = entries.find(
        ([k, v]) =>
          normalize(k).includes("status") ||
          v?.type === "status" ||
          v?.type === "select",
      )?.[1];
      const status =
        statusProp?.type === "status"
          ? statusProp?.status?.name || "Draft"
          : statusProp?.type === "select"
            ? statusProp?.select?.name || "Draft"
            : "Draft";
      if (!status.toLowerCase().includes("publish")) return null;

      const blocks = await listAllChildren(notion, page.id);
      const content = extractPlainTextFromBlocks(blocks);

      return {
        title,
        content: content || title,
        updatedAt: page.last_edited_time as string,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export default async function BlogPostPage({ params }: BlogPageParams) {
  const { slug } = await params;
  const post = await loadPublishedStoryBySlug(slug);

  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl bg-white px-6 py-12 text-[#111111]">
      <article className="border border-[#E5E5E5] bg-white p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Blog</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{post.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Last updated {new Date(post.updatedAt).toLocaleString()}
        </p>
        <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-zinc-800">
          {post.content}
        </div>
      </article>
    </main>
  );
}
