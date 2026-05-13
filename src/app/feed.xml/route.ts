import { NextResponse } from "next/server";
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://kreatly.vercel.app";

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

    const itemsXml = all
      .map((page: any) => {
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

        const descriptionSource =
          properties?.Description?.rich_text ??
          properties?.Summary?.rich_text ??
          [];

        const descriptionText = Array.isArray(descriptionSource)
          ? descriptionSource
              .map((t: any) => t?.plain_text || "")
              .join(" ")
              .trim()
          : "";

        const safeTitle = escapeXml(rawTitle);
        const safeDescription = escapeXml(
          descriptionText || "Notion-powered article from the Kreatly Blog.",
        );

        const link = `${siteUrl}/blog/${encodeURIComponent(slug)}`;
        const pubDate = date ? new Date(date).toUTCString() : new Date().toUTCString();

        return `
  <item>
    <title>${safeTitle}</title>
    <link>${link}</link>
    <guid>${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${safeDescription}</description>
  </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Kreatly Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Clean, Notion-powered articles from the Kreatly Newsroom OS.</description>
    ${itemsXml}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Kreatly Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Clean, Notion-powered articles from the Kreatly Newsroom OS.</description>
  </channel>
</rss>`;

    return new NextResponse(fallbackXml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "public, max-age=120",
      },
    });
  }
}

