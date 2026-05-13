import { Client } from "@notionhq/client";

const notionSecret = process.env.NOTION_SECRET;

if (!notionSecret) {
  throw new Error("Missing NOTION_SECRET environment variable.");
}

export const notion = new Client({
  auth: notionSecret,
});

const NOTION_STATUS_PUBLISHED = "Published";

type StaticPage = {
  id: string;
  title: string;
  slug: string;
};

export async function fetchStaticPageBySlug(slug: string): Promise<StaticPage | null> {
  const databaseId = process.env.NOTION_PAGES_DATABASE_ID;

  if (!databaseId) {
    throw new Error("Missing NOTION_PAGES_DATABASE_ID environment variable.");
  }

  if (!slug.trim()) return null;

  // eslint-disable-next-line no-console
  console.log("🔍 Fetching Static Page for slug:", slug);
  // eslint-disable-next-line no-console
  console.log("📂 Using Database ID:", databaseId);

  const response: any = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: "status",
          select: {
            equals: NOTION_STATUS_PUBLISHED,
          } as any,
        },
        {
          property: "slug",
          rich_text: {
            equals: slug,
          },
        } as any,
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

  const slugProp = properties?.slug || properties?.Slug;
  const slugFromProp =
    slugProp?.type === "rich_text" && Array.isArray(slugProp.rich_text)
      ? slugProp.rich_text.map((t: any) => t?.plain_text || "").join("").trim()
      : slug;

  // eslint-disable-next-line no-console
  console.log("✅ Page found! Rendering static page with slug:", slugFromProp || slug);

  return {
    id: page.id,
    title,
    slug: slugFromProp || slug,
  };
}

