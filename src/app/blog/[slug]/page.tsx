import { Client } from "@notionhq/client";
import type { Metadata } from "next";
import Link from "next/link";

type PageParams = {
  params: Promise<{ slug: string }>;
};

type NotionPost = {
  id: string;
  title: string;
  slug: string;
  date: string | null;
  tags: string[];
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

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            // Slug column is capitalized in your Notion schema.
            property: "Slug",
            rich_text: { equals: slug },
          },
          {
            // Your Notion column `status` is a Select, not a native Status.
            // Use the select filter so the types match.
            property: "status",
            select: { equals: NOTION_STATUS_PUBLISHED } as any,
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

    const tags: string[] =
      Array.isArray(properties?.Tags?.multi_select) &&
      properties.Tags.multi_select.length > 0
        ? properties.Tags.multi_select
            .map((t: any) => t?.name)
            .filter((name: unknown): name is string => typeof name === "string")
        : [];

    const blocks: any[] = [];
    let cursor: string | undefined;
    try {
      do {
        const chunk: any = await notion.blocks.children.list({
          block_id: page.id,
          page_size: 100,
          start_cursor: cursor,
        });
        blocks.push(...(chunk.results ?? []));
        cursor = chunk.has_more ? chunk.next_cursor ?? undefined : undefined;
      } while (cursor);
    } catch (blockError) {
      // eslint-disable-next-line no-console
      console.error("[blog/[slug]] Failed to fetch Notion blocks:", blockError);
    }

    return {
      id: page.id,
      title,
      slug,
      date,
      tags,
      blocks,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[blog/[slug]] Failed to fetch post by slug:", error);
    // Re-throw so the page component can surface the error to the user for debugging.
    throw error;
  }
}

function renderRichText(rich: any[] | undefined): string {
  if (!Array.isArray(rich)) return "";
  return rich.map((t: any) => t?.plain_text || "").join("");
}

function renderBlock(block: any) {
  const type = block.type;
  const value = (block as any)[type];

  if (!value) return null;
  const rich = Array.isArray((value as any).rich_text) ? (value as any).rich_text : undefined;

  switch (type) {
    case "heading_1":
      return (
        <h1 key={block.id} className="mt-8">
          {renderRichText(rich)}
        </h1>
      );
    case "heading_2":
      return (
        <h2 key={block.id} className="mt-8">
          {renderRichText(rich)}
        </h2>
      );
    case "heading_3":
      return (
        <h3 key={block.id} className="mt-6">
          {renderRichText(rich)}
        </h3>
      );
    case "paragraph":
      return (
        <p key={block.id}>
          {renderRichText(rich)}
        </p>
      );
    case "bulleted_list_item":
      return (
        <li key={block.id} className="list-disc">
          {renderRichText(rich)}
        </li>
      );
    case "numbered_list_item":
      return (
        <li key={block.id} className="list-decimal">
          {renderRichText(rich)}
        </li>
      );
    case "quote":
      return (
        <blockquote key={block.id}>
          {renderRichText(rich)}
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
        openGraph: {
          title: "Post not found",
          type: "article",
        },
      };
    }

    const description = `Read ${post.title} on Kreatly.`;

    return {
      title: post.title,
      description,
      keywords: post.tags && post.tags.length > 0 ? post.tags : undefined,
      openGraph: {
        title: post.title,
        type: "article",
      },
    };
  } catch {
    return {
      title: "Post not available",
      description: "This article is not available.",
      openGraph: {
        title: "Post not available",
        type: "article",
      },
    };
  }
}

export default async function BlogReaderPage({ params }: PageParams) {
  const { slug } = await params;

  let post: NotionPost | null = null;
  let debugError: unknown = null;

  try {
    post = await fetchPostBySlug(slug);
    if (!post) {
      debugError = "Post simply returned null";
    }
  } catch (error) {
    debugError = error;
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="p-10 text-red-500 font-mono border border-red-500 rounded bg-red-50">
            <h3 className="mb-3 text-sm font-semibold">DEBUG LOG:</h3>
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(
                debugError || "Post simply returned null",
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      </main>
    );
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
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          {formattedDate ? <p>{formattedDate}</p> : null}
          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/tag/${encodeURIComponent(tag)}`}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-10">
          <div className="prose prose-lg max-w-3xl mx-auto prose-zinc dark:prose-invert prose-headings:font-semibold prose-p:text-zinc-700 prose-a:text-sky-600 prose-a:no-underline hover:prose-a:underline prose-li:my-1">
            {post.blocks.map((block) => renderBlock(block))}
          </div>
        </div>
      </article>
    </main>
  );
}
