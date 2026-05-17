import { Client } from "@notionhq/client";
import Link from "next/link";

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
  if (!secret || !databaseId) throw new Error("Missing NOTION_SECRET or NOTION_DATABASE_ID");
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

async function fetchPublishedPosts(): Promise<NotionIndexPost[]> {
  const { notion, databaseId } = await getNotionClient();
  const all: any[] = [];
  let cursor: string | undefined;

  try {
    do {
      const resp: any = await notion.databases.query({
        database_id: databaseId,
        filter: { and: [{ property: "status", select: { equals: NOTION_STATUS_PUBLISHED } as any }] },
        sorts: [{ property: "Date", direction: "descending" } as any],
        start_cursor: cursor,
        page_size: 50,
      } as any);
      all.push(...(resp.results ?? []));
      cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
    } while (cursor);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[blog/index] Failed to query Notion:", error);
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

    return { id: page.id, title: rawTitle, slug, date };
  });

  return mapped.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
}

function formatDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function BlogIndexPage() {
  const posts = await fetchPublishedPosts();

  return (
    <main className="min-h-screen bg-white px-4 py-12 text-zinc-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl">
        <header className="mb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Kreatly Blog
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Latest articles
          </h1>
          <p className="mt-2 text-[13px] text-zinc-400">
            Notion-powered posts — always in sync.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-12 text-[13px] text-zinc-400">
            No published posts yet. Publish a story from your dashboard to see it here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${encodeURIComponent(post.slug)}`}
                  className="group flex items-center justify-between gap-4 py-4 transition-colors hover:bg-zinc-50 -mx-2 px-2 rounded-md"
                >
                  <h2 className="text-[15px] font-medium text-zinc-900 group-hover:text-zinc-600 transition-colors">
                    {post.title}
                  </h2>
                  {post.date ? (
                    <p className="shrink-0 text-xs text-zinc-400">
                      {formatDate(post.date)}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
