import { Client } from "@notionhq/client";
import Link from "next/link";

type PageParams = {
  params: Promise<{ tag: string }>;
};

type NotionIndexPost = {
  id: string;
  title: string;
  slug: string;
  date: string | null;
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

async function fetchPostsByTag(tag: string): Promise<NotionIndexPost[]> {
  const { notion, databaseId } = await getNotionClient();

  const all: any[] = [];
  let cursor: string | undefined;

  try {
    do {
      const resp: any = await notion.databases.query({
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
                contains: tag,
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
        start_cursor: cursor,
        page_size: 50,
      } as any);

      all.push(...(resp.results ?? []));
      cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
    } while (cursor);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[blog/tag/[tag]] Failed to query Notion for tag posts:", error);
    return [];
  }

  const mapped: NotionIndexPost[] = all.map((page: any) => {
    const properties = page.properties || {};
    const titleProp: any = properties?.Name || properties?.Title || {};
    const rawTitle =
      (Array.isArray(titleProp?.title)
        ? titleProp.title.map((t: any) => t?.plain_text || "").join("").trim()
        : "") || "Untitled";

    const slugProp = properties?.Slug;
    const slugFromProp =
      slugProp?.type === "rich_text" && Array.isArray(slugProp.rich_text)
        ? slugProp.rich_text.map((t: any) => t?.plain_text || "").join("").trim()
        : "";

    const slug = toSlug(slugFromProp || rawTitle, page.id);

    const date =
      properties?.Date?.date?.start ||
      (typeof page.last_edited_time === "string" ? page.last_edited_time : null);

    return {
      id: page.id,
      title: rawTitle,
      slug,
      date,
    };
  });

  return mapped;
}

function formatDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogTagPage({ params }: PageParams) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const posts = await fetchPostsByTag(decodedTag);

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Kreatly Blog
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Posts tagged: <span className="text-sky-600">{decodedTag}</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Curated articles filtered by this topic.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-12 text-sm text-zinc-500">
          No posts published with this tag yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li
              key={post.id}
              className="group rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
            >
              <Link
                href={`/blog/${encodeURIComponent(post.slug)}`}
                className="flex items-baseline justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-zinc-900 group-hover:text-sky-600">
                    {post.title}
                  </h2>
                </div>
                {post.date ? (
                  <p className="shrink-0 text-xs text-zinc-500">
                    {formatDate(post.date)}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

