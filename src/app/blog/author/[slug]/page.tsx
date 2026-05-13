import type { Metadata } from "next";
import Link from "next/link";
import { fetchAuthorBySlug, fetchAuthorByPageId, type AuthorProfile, notion } from "@/lib/notion";

type PageParams = {
  params: Promise<{ slug: string }>;
};

type AuthorPost = {
  id: string;
  title: string;
  slug: string;
  date: string | null;
};

const NOTION_STATUS_PUBLISHED = "Published";

async function fetchPostsForAuthor(authorId: string): Promise<AuthorPost[]> {
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw new Error("Missing NOTION_DATABASE_ID environment variable.");
  }

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
              property: "Author",
              relation: {
                contains: authorId,
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
    console.error("[blog/author/[slug]] Failed to query posts for author:", error);
    return [];
  }

  return all.map((page: any) => {
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

    const date =
      properties?.Date?.date?.start ||
      (typeof page.last_edited_time === "string" ? page.last_edited_time : null);

    return {
      id: page.id,
      title: rawTitle,
      slug: slugFromProp || page.id,
      date,
    };
  });
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;

  try {
    const author = await fetchAuthorBySlug(slug);
    if (!author) {
      return {
        title: "Author not found",
        description: "This author profile does not exist.",
      };
    }

    return {
      title: `${author.name} – Kreatly Blog`,
      description: author.bio || `Read posts written by ${author.name} on Kreatly.`,
    };
  } catch {
    return {
      title: "Author",
      description: "Author profile.",
    };
  }
}

export default async function AuthorPage({ params }: PageParams) {
  const { slug } = await params;

  let author: AuthorProfile | null = null;
  let posts: AuthorPost[] = [];

  try {
    author = await fetchAuthorBySlug(slug);
    if (author) {
      posts = await fetchPostsForAuthor(author.id);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[blog/author/[slug]] Failed to load author page:", error);
  }

  if (!author) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Author not found
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            We couldn&apos;t find this author profile.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center gap-4">
          {author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.avatarUrl}
              alt={author.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold uppercase tracking-wide text-white">
              {author.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {author.name}
            </h1>
            {author.bio ? (
              <p className="mt-2 text-sm text-zinc-500">{author.bio}</p>
            ) : null}
          </div>
        </header>

        <div className="border-t border-zinc-200 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Posts by {author.name}
          </h2>
          {posts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No posts published by this author yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
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
                      <h3 className="truncate text-base font-semibold text-zinc-900 group-hover:text-sky-600">
                        {post.title}
                      </h3>
                    </div>
                    {post.date ? (
                      <p className="shrink-0 text-xs text-zinc-500">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

