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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const rawQuery = typeof body.query === "string" ? body.query.trim() : "";

    if (!rawQuery) {
      return NextResponse.json({ success: true, items: [] });
    }

    const query = rawQuery.slice(0, 120);

    const { notion, databaseId } = await getNotionClient();

    const response: any = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: "status",
            select: { equals: NOTION_STATUS_PUBLISHED } as any,
          },
          {
            or: [
              {
                property: "Name",
                title: {
                  contains: query,
                },
              } as any,
              {
                property: "Title",
                title: {
                  contains: query,
                },
              } as any,
              {
                property: "Description",
                rich_text: {
                  contains: query,
                },
              } as any,
              {
                property: "Summary",
                rich_text: {
                  contains: query,
                },
              } as any,
            ],
          },
        ],
      },
      sorts: [
        {
          property: "Date",
          direction: "descending",
        } as any,
      ],
      page_size: 10,
    } as any);

    const items =
      response.results?.map((page: any) => {
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
      }) ?? [];

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message ?? "Failed to search posts.",
      },
      { status: 500 },
    );
  }
}

