import React from "react";
import { Client } from "@notionhq/client";
import type { Metadata } from "next";
import Link from "next/link";
import { fetchAuthorByPageId, type AuthorProfile } from "@/lib/notion";
import SubscribeBox from "@/app/blog/_components/SubscribeBox";

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
  blocksError?: string | null;
  author?: AuthorProfile | null;
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

function toSlug(value: string, fallbackId: string): string {
  const base = value || fallbackId;
  return (
    base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120) || fallbackId.replace(/-/g, "").toLowerCase()
  );
}

function extractTitle(properties: any): string {
  const props = properties || {};
  const keys = Object.keys(props);
  const titleKey = keys.find((key) => props[key]?.type === "title");
  if (!titleKey) return "Untitled";

  const titleProp: any = props[titleKey];
  const arr = Array.isArray(titleProp?.title) ? titleProp.title : [];
  const text = arr.map((t: any) => t?.plain_text || "").join("").trim();
  return text || "Untitled";
}

async function fetchRelatedPosts(
  currentId: string,
  currentSlug: string,
  tags: string[],
): Promise<NotionPost[]> {
  if (!tags.length) return [];

  const { notion, databaseId } = await getNotionClient();

  try {
    const response: any = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: "status",
            select: { equals: NOTION_STATUS_PUBLISHED } as any,
          },
          {
            property: "Tags",
            multi_select: {
              contains: tags[0],
            } as any,
          },
        ],
      },
      sorts: [
        {
          property: "Date",
          direction: "descending",
        } as any,
      ],
      page_size: 5,
    } as any);

    const mapped: NotionPost[] =
      response.results?.map((page: any) => {
        if (page.id === currentId) return null;

        const properties = page.properties || {};
        const titleProp: any = properties?.Name || properties?.Title || {};
        const title =
          (Array.isArray(titleProp?.title)
            ? titleProp.title.map((t: any) => t?.plain_text || "").join("").trim()
            : "") || "Untitled";

        const slugProp = properties?.Slug;
        const slugFromProp =
          slugProp?.type === "rich_text" && Array.isArray(slugProp.rich_text)
            ? slugProp.rich_text.map((t: any) => t?.plain_text || "").join("").trim()
            : "";

        const slug = slugFromProp || currentSlug;

        const date =
          properties?.Date?.date?.start ||
          (typeof page.last_edited_time === "string" ? page.last_edited_time : null);

        const relatedTags: string[] =
          Array.isArray(properties?.Tags?.multi_select) &&
          properties.Tags.multi_select.length > 0
            ? properties.Tags.multi_select
                .map((t: any) => t?.name)
                .filter((name: unknown): name is string => typeof name === "string")
            : [];

        return {
          id: page.id,
          title,
          slug,
          date,
          tags: relatedTags,
          blocks: [],
        };
      }) ?? [];

    return mapped.filter((p): p is NotionPost => Boolean(p)).slice(0, 3);
  } catch {
    return [];
  }
}

async function fetchPostBySlug(slug: string): Promise<NotionPost | null> {
  const { notion, databaseId } = await getNotionClient();

  try {
    // First, fetch all published pages, then match by the same slug logic
    // used throughout the rest of the app. This avoids subtle mismatches
    // between the raw Notion "Slug" field and the normalized URL slug.
    const all: any[] = [];
    let cursor: string | undefined;

    do {
      const resp: any = await notion.databases.query({
        database_id: databaseId,
        filter: {
          and: [
            {
              property: "status",
              select: { equals: NOTION_STATUS_PUBLISHED } as any,
            },
          ],
        },
        start_cursor: cursor,
        page_size: 50,
      } as any);

      all.push(...(resp.results ?? []));
      cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
    } while (cursor);

    const page: any | undefined = all.find((p: any) => {
      const properties = p.properties || {};
      const title = extractTitle(properties);
      const slugProp = properties?.Slug;
      const rawSlug =
        slugProp?.type === "rich_text" && Array.isArray(slugProp.rich_text)
          ? slugProp.rich_text.map((t: any) => t?.plain_text || "").join("").trim()
          : "";
      const computed = toSlug(rawSlug || title, p.id);
      return computed === slug;
    });

    if (!page) {
      // eslint-disable-next-line no-console
      console.warn("[blog/[slug]] No page matched slug after normalization:", slug);
      return null;
    }

    const properties = page.properties || {};
    const title = extractTitle(properties);

    const date =
      properties?.Date?.date?.start ||
      (typeof page.last_edited_time === "string" ? page.last_edited_time : null);

    let author: AuthorProfile | null = null;
    const authorRel = properties?.["Authors."] || properties?.Author || properties?.author;
    const authorRelation =
      authorRel?.type === "relation" && Array.isArray(authorRel.relation)
        ? authorRel.relation
        : [];
    if (authorRelation[0]?.id) {
      try {
        author = await fetchAuthorByPageId(authorRelation[0].id);
      } catch {
        author = null;
      }
    }

    const tags: string[] =
      Array.isArray(properties?.Tags?.multi_select) &&
      properties.Tags.multi_select.length > 0
        ? properties.Tags.multi_select
            .map((t: any) => t?.name)
            .filter((name: unknown): name is string => typeof name === "string")
        : [];

    const blocks: any[] = [];
    let blocksError: string | null = null;
    let blocksCursor: string | undefined;
    // eslint-disable-next-line no-console
    console.log("[blog/[slug]] fetching blocks for page id:", page.id);
    try {
      do {
        const chunk: any = await notion.blocks.children.list({
          block_id: page.id,
          page_size: 100,
          start_cursor: blocksCursor,
        });
        blocks.push(...(chunk.results ?? []));
        blocksCursor = chunk.has_more ? chunk.next_cursor ?? undefined : undefined;
      } while (blocksCursor);
      // eslint-disable-next-line no-console
      console.log("[blog/[slug]] blocks fetched:", blocks.length, "types:", [...new Set(blocks.map((b: any) => b.type))]);
    } catch (blockErr) {
      blocksError = blockErr instanceof Error ? blockErr.message : String(blockErr);
      // eslint-disable-next-line no-console
      console.error("[blog/[slug]] ❌ blocks.children.list failed:", blockErr);
    }

    return {
      id: page.id,
      title,
      slug,
      date,
      tags,
      blocks,
      blocksError,
      author,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[blog/[slug]] Failed to fetch post by slug:", error);
    // Re-throw so the page component can surface the error to the user for debugging.
    throw error;
  }
}

function renderRichText(rich: any[] | undefined): React.ReactNode {
  if (!Array.isArray(rich) || rich.length === 0) return null;
  return rich.map((t: any, i: number) => {
    const text = t?.plain_text || "";
    if (!text) return null;
    const ann = t?.annotations || {};
    const href = t?.href;

    let node: React.ReactNode = text;
    if (ann.code) node = <code key={i} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm text-zinc-800">{text}</code>;
    if (ann.bold) node = <strong key={i}>{node}</strong>;
    if (ann.italic) node = <em key={i}>{node}</em>;
    if (ann.strikethrough) node = <s key={i}>{node}</s>;
    if (ann.underline) node = <span key={i} className="underline">{node}</span>;
    if (href) node = <a key={i} href={href} target="_blank" rel="noreferrer" className="text-zinc-900 underline underline-offset-2 hover:text-zinc-600">{node}</a>;

    return <span key={i}>{node}</span>;
  });
}

function renderBlock(block: any): React.ReactNode {
  const type: string = block.type;
  const value = (block as any)[type];

  if (!value) return null;
  const rich = Array.isArray((value as any).rich_text) ? (value as any).rich_text : undefined;

  switch (type) {
    case "heading_1":
      return <h1 key={block.id} className="mt-8 text-2xl font-bold text-zinc-900">{renderRichText(rich)}</h1>;
    case "heading_2":
      return <h2 key={block.id} className="mt-8 text-xl font-bold text-zinc-900">{renderRichText(rich)}</h2>;
    case "heading_3":
      return <h3 key={block.id} className="mt-6 text-lg font-semibold text-zinc-800">{renderRichText(rich)}</h3>;
    case "paragraph": {
      const content = renderRichText(rich);
      return <p key={block.id} className="my-3 leading-7 text-zinc-600">{content || <br />}</p>;
    }
    case "bulleted_list_item":
      return <li key={block.id} className="ml-6 list-disc leading-7 text-zinc-600">{renderRichText(rich)}</li>;
    case "numbered_list_item":
      return <li key={block.id} className="ml-6 list-decimal leading-7 text-zinc-600">{renderRichText(rich)}</li>;
    case "quote":
      return (
        <blockquote key={block.id} className="my-4 border-l-4 border-zinc-200 pl-4 italic text-zinc-500">
          {renderRichText(rich)}
        </blockquote>
      );
    case "code": {
      const lang = value?.language || "";
      const codeText = Array.isArray(value?.rich_text)
        ? value.rich_text.map((t: any) => t?.plain_text || "").join("")
        : "";
      return (
        <pre key={block.id} className="my-4 overflow-x-auto rounded-lg border border-zinc-100 bg-zinc-50 px-5 py-4 text-sm text-zinc-800">
          <code data-language={lang}>{codeText}</code>
        </pre>
      );
    }
    case "image": {
      const src = value?.external?.url ?? value?.file?.url ?? null;
      const caption = Array.isArray(value?.caption)
        ? value.caption.map((t: any) => t?.plain_text || "").join("").trim()
        : "";
      if (!src) return null;
      return (
        <figure key={block.id} className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={caption || "image"} className="w-full rounded-lg object-cover" />
          {caption ? <figcaption className="mt-2 text-center text-xs text-zinc-400">{caption}</figcaption> : null}
        </figure>
      );
    }
    case "callout": {
      const emoji = value?.icon?.emoji || "💡";
      return (
        <div key={block.id} className="my-4 flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <span>{emoji}</span>
          <p className="leading-7 text-zinc-600">{renderRichText(rich)}</p>
        </div>
      );
    }
    case "divider":
      return <hr key={block.id} className="my-8 border-zinc-100" />;
    case "toggle":
      return (
        <details key={block.id} className="my-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2">
          <summary className="cursor-pointer font-medium text-zinc-700">{renderRichText(rich)}</summary>
        </details>
      );
    default:
      return null;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kreatly.vercel.app";

  try {
    const post = await fetchPostBySlug(slug);
    if (!post) {
      return {
        title: "Post not found — Kreatly",
        description: "This article is not published or does not exist.",
        openGraph: { title: "Post not found — Kreatly", type: "article" },
      };
    }

    // Build a rich description: first 160 chars of plain body text.
    const plainText = post.blocks
      .map((b: any) => {
        const rich = b?.[b.type]?.rich_text;
        return Array.isArray(rich)
          ? rich.map((t: any) => t?.plain_text ?? "").join("")
          : "";
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const description = plainText.length > 0
      ? plainText.slice(0, 160).trimEnd() + (plainText.length > 160 ? "…" : "")
      : `Read "${post.title}" on Kreatly.`;

    const canonicalUrl = `${siteUrl}/blog/${slug}`;
    const ogImage = post.blocks.find((b: any) => b.type === "image")
      ? (post.blocks.find((b: any) => b.type === "image") as any)?.image?.external?.url ??
        (post.blocks.find((b: any) => b.type === "image") as any)?.image?.file?.url ??
        null
      : null;

    return {
      title: `${post.title} — Kreatly`,
      description,
      keywords: post.tags.length > 0 ? post.tags : undefined,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: post.title,
        description,
        type: "article",
        url: canonicalUrl,
        publishedTime: post.date ?? undefined,
        tags: post.tags.length > 0 ? post.tags : undefined,
        ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }] } : {}),
      },
      twitter: {
        card: ogImage ? "summary_large_image" : "summary",
        title: post.title,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  } catch {
    return {
      title: "Post not available — Kreatly",
      description: "This article is not currently available.",
      openGraph: { title: "Post not available — Kreatly", type: "article" },
    };
  }
}

export default async function BlogReaderPage({ params }: PageParams) {
  const { slug } = await params;

  let post: NotionPost | null = null;
  let debugError: unknown = null;
  let related: NotionPost[] = [];

  try {
    post = await fetchPostBySlug(slug);
    if (!post) {
      debugError = "Post simply returned null";
    } else {
      related = await fetchRelatedPosts(post.id, post.slug, post.tags);
    }
  } catch (error) {
    debugError = error;
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-white px-4 py-12 text-zinc-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 font-mono text-red-700">
            <h3 className="mb-3 text-sm font-semibold">DEBUG LOG:</h3>
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(debugError || "Post simply returned null", null, 2)}
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
    <main className="min-h-screen bg-white px-4 py-12 text-zinc-900 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Kreatly Blog
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {formattedDate ? (
            <p className="text-xs text-zinc-400">{formattedDate}</p>
          ) : null}
          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          {post.blocksError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-mono text-xs text-red-700">
              <strong>Block fetch error:</strong> {post.blocksError}
              <br />
              Make sure the Kreatly Notion integration is invited to this page.
            </div>
          ) : post.blocks.length === 0 ? (
            <p className="italic text-sm text-zinc-400">
              No content blocks returned from Notion.
            </p>
          ) : (
            <div className="mx-auto max-w-3xl">
              {post.blocks.map((block) => renderBlock(block))}
            </div>
          )}
        </div>

        {post.author ? (
          <section className="mt-12 border-t border-zinc-100 pt-8">
            <div className="flex items-center gap-4">
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  {post.author.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <Link
                  href={`/blog/author/${encodeURIComponent(post.author.slug)}`}
                  className="text-sm font-semibold text-zinc-900 transition-colors hover:text-zinc-600"
                >
                  {post.author.name}
                </Link>
                {post.author.bio ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{post.author.bio}</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-10 border-t border-zinc-100 pt-8">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Related posts
            </h2>
            <div className="mt-4 space-y-1">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${encodeURIComponent(item.slug)}`}
                  className="group flex items-baseline justify-between gap-4 rounded-md px-2 py-2 transition-colors hover:bg-zinc-50"
                >
                  <span className="truncate text-[13px] font-medium text-zinc-700 group-hover:text-zinc-900">
                    {item.title}
                  </span>
                  {item.date ? (
                    <span className="shrink-0 text-xs text-zinc-400">
                      {new Date(item.date).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>

      <SubscribeBox slug={slug} />
    </main>
  );
}
