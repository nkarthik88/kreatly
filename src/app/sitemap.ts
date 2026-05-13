import type { MetadataRoute } from "next";
import { Client } from "@notionhq/client";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://kreatly.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
    },
  ];

  try {
    const { notion, databaseId } = await getNotionClient();

    const all: any[] = [];
    let cursor: string | undefined;

    do {
      const resp: any = await notion.databases.query({
        database_id: databaseId,
        filter: {
          property: "status",
          select: { equals: NOTION_STATUS_PUBLISHED } as any,
        },
        start_cursor: cursor,
        page_size: 50,
      } as any);

      all.push(...(resp.results ?? []));
      cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
    } while (cursor);

    const dynamicRoutes: MetadataRoute.Sitemap = all.map((page: any) => {
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

      const lastEdited =
        properties?.Date?.date?.start ||
        (typeof page.last_edited_time === "string" ? page.last_edited_time : undefined);

      return {
        url: `${siteUrl}/blog/${encodeURIComponent(slug)}`,
        lastModified: lastEdited ? new Date(lastEdited) : new Date(),
      };
    });

    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}

