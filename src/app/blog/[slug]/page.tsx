import { Client } from "@notionhq/client";
import { notFound } from "next/navigation";

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
