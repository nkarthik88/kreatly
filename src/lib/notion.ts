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

export type AuthorProfile = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string | null;
};

function extractPlainText(rich: any[] | undefined): string {
  if (!Array.isArray(rich)) return "";
  return rich.map((t: any) => t?.plain_text || "").join("").trim();
}

export async function fetchAuthorByPageId(pageId: string): Promise<AuthorProfile | null> {
  if (!pageId) return null;

  const page: any = await notion.pages.retrieve({ page_id: pageId });
  const properties = page.properties || {};

  const titleProp: any = properties?.Name || properties?.Title || {};
  const name = extractPlainText(titleProp?.title) || "Unknown author";

  const slugProp = properties?.slug || properties?.Slug;
  const slug =
    (slugProp?.type === "rich_text" && Array.isArray(slugProp.rich_text)
      ? extractPlainText(slugProp.rich_text)
      : "") || pageId.replace(/-/g, "").toLowerCase();

  const bioProp = properties?.bio || properties?.Bio || properties?.Summary;
  const bio =
    (bioProp?.type === "rich_text" && Array.isArray(bioProp.rich_text)
      ? extractPlainText(bioProp.rich_text)
      : "") || "";

  const avatarProp = properties?.Avatar || properties?.avatar || properties?.Photo;
  let avatarUrl: string | null = null;
  if (avatarProp?.type === "files" && Array.isArray(avatarProp.files) && avatarProp.files[0]) {
    const file = avatarProp.files[0];
    avatarUrl =
      file.external?.url ??
      file.file?.url ??
      null;
  }

  return {
    id: page.id,
    name,
    slug,
    bio,
    avatarUrl,
  };
}

export async function fetchAuthorBySlug(slug: string): Promise<AuthorProfile | null> {
  const databaseId = process.env.NOTION_AUTHORS_DATABASE_ID;
  if (!databaseId) {
    throw new Error("Missing NOTION_AUTHORS_DATABASE_ID environment variable.");
  }
  if (!slug.trim()) return null;

  const resp: any = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "slug",
      rich_text: {
        equals: slug,
      },
    } as any,
    page_size: 1,
  } as any);

  const page: any | undefined = resp.results?.[0];
  if (!page) return null;

  return fetchAuthorByPageId(page.id);
}


