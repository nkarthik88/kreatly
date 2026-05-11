import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, "_");
}

function extractNotionIdCandidates(input?: string): string[] {
  const raw = String(input ?? "").trim();
  if (!raw) return [];

  const candidates: string[] = [];

  const pushCandidate = (value?: string | null) => {
    if (!value) return;
    const normalized = value.replace(/-/g, "").toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(normalized)) return;
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  const direct = raw.replace(/-/g, "");
  pushCandidate(direct);

  try {
    const url = new URL(raw);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const tailSegment = pathSegments[pathSegments.length - 1] ?? "";
    const tailMatches = tailSegment.match(/[a-f0-9]{32}/gi) ?? [];
    tailMatches.forEach((match) => pushCandidate(match));
  } catch {
    // Not a URL, continue with regex fallback
  }

  const matches = raw.match(/[a-f0-9]{32}/gi);
  (matches ?? []).forEach((match) => pushCandidate(match));

  return candidates;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function fallbackSlugFromPageId(pageId: string): string {
  return pageId.replace(/-/g, "").toLowerCase();
}

function extractRichTextString(property: any): string {
  if (!property) return "";
  if (property?.type === "rich_text" && Array.isArray(property.rich_text)) {
    return property.rich_text.map((t: any) => t?.plain_text || "").join("").trim();
  }
  if (property?.type === "title" && Array.isArray(property.title)) {
    return property.title.map((t: any) => t?.plain_text || "").join("").trim();
  }
  if (property?.type === "formula") {
    return String(property?.formula?.string || "").trim();
  }
  if (property?.type === "url") {
    return String(property?.url || "").trim();
  }
  return "";
}

function extractFirstByKeyMatch(
  properties: Record<string, any>,
  matchers: string[],
): string {
  const entry = Object.entries(properties).find(([key]) => {
    const normalized = normalize(key);
    return matchers.some((matcher) => normalized.includes(matcher));
  });
  return extractRichTextString(entry?.[1]);
}

function extractPlainTextFromBlocks(blocks: any[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const type = block.type;
    const value = (block as any)[type];
    const rich = Array.isArray(value?.rich_text)
      ? value.rich_text
      : type === "table_row" && Array.isArray(value?.cells)
        ? value.cells.flatMap((cell: any) => (Array.isArray(cell) ? cell : []))
        : [];
    const text =
      rich.map((t: any) => t?.plain_text || "").join("") ||
      value?.caption?.map((t: any) => t?.plain_text || "").join("") ||
      value?.title ||
      "";
    if (!text.trim()) continue;

    if (type.startsWith("heading_")) {
      lines.push(text.trim());
    } else if (
      type === "bulleted_list_item" ||
      type === "numbered_list_item" ||
      type === "to_do"
    ) {
      lines.push(`• ${text.trim()}`);
    } else {
      lines.push(text.trim());
    }
  }

  return lines.join("\n");
}

function extractTitleFromProperties(props: Record<string, any>): string {
  const entries = Object.entries(props ?? {});

  // Priority 1: Explicit property keys users often configure
  const priorityKeys = ["Name", "name", "Title", "title"];
  for (const key of priorityKeys) {
    const property = (props as any)?.[key];
    if (!property) continue;

    if (property?.type === "title" && Array.isArray(property?.title)) {
      const value = property.title.map((t: any) => t?.plain_text || "").join("").trim();
      if (value) return value;
    }
    if (property?.type === "rich_text" && Array.isArray(property?.rich_text)) {
      const value = property.rich_text
        .map((t: any) => t?.plain_text || "")
        .join("")
        .trim();
      if (value) return value;
    }
  }

  // Priority 2: First property with type=title
  for (const [, property] of entries) {
    if (property?.type === "title" && Array.isArray(property?.title)) {
      const value = property.title.map((t: any) => t?.plain_text || "").join("").trim();
      if (value) return value;
    }
  }

  return "";
}

async function listAllChildren(notion: Client, blockId: string): Promise<any[]> {
  let hasMore = true;
  let cursor: string | undefined = undefined;
  const all: any[] = [];

  while (hasMore) {
    const response: any = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    });

    all.push(...(response.results ?? []));
    hasMore = Boolean(response.has_more);
    cursor = response.next_cursor ?? undefined;
  }

  return all;
}

async function collectNestedBlocks(notion: Client, blockId: string): Promise<any[]> {
  const children = await listAllChildren(notion, blockId);
  const all = [...children];

  for (const child of children) {
    if (child?.has_children && child?.id) {
      const nested = await collectNestedBlocks(notion, child.id);
      all.push(...nested);
    }
  }

  return all;
}

function shouldTryChildDatabaseFallback(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("is a page") || message.includes("is a block");
}

async function queryByIdDirectly(
  notion: Client,
  id: string,
  sorts: Array<{ timestamp: "last_edited_time"; direction: "descending" }>,
): Promise<any> {
  const databasesAny = notion.databases as any;
  if (typeof databasesAny?.query === "function") {
    return await databasesAny.query({
      database_id: id,
      page_size: 10,
      sorts,
    });
  }

  try {
    return await notion.dataSources.query({
      data_source_id: id,
      page_size: 10,
      sorts,
    });
  } catch (error: any) {
    const database: any = await notion.databases.retrieve({ database_id: id });
    const dataSourceId = database?.data_sources?.[0]?.id;
    if (!dataSourceId) throw error;

    return await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 10,
      sorts,
    });
  }
}

async function queryFromChildDatabase(
  notion: Client,
  pageId: string,
  sorts: Array<{ timestamp: "last_edited_time"; direction: "descending" }>,
): Promise<any> {
  const nested = await collectNestedBlocks(notion, pageId);
  const childDatabase = nested.find((block: any) => block?.type === "child_database");
  const childDatabaseId: string | undefined = childDatabase?.id;

  if (!childDatabaseId) {
    throw new Error(
      "The provided Notion URL points to a page without an accessible child database.",
    );
  }

  return await notion.dataSources.query({
    data_source_id: childDatabaseId,
    page_size: 10,
    sorts,
  });
}

async function queryFromCandidates(
  notion: Client,
  candidates: string[],
  pageUrlCandidates: Set<string>,
  sorts: Array<{ timestamp: "last_edited_time"; direction: "descending" }>,
): Promise<{ response: any; resolvedId: string }> {
  let lastErrorMessage = "Could not resolve Notion database/data source ID.";

  for (const candidate of candidates) {
    try {
      // Direct query first as requested.
      const response = await queryByIdDirectly(notion, candidate, sorts);
      return { response, resolvedId: candidate };
    } catch (error: any) {
      if (shouldTryChildDatabaseFallback(error) || pageUrlCandidates.has(candidate)) {
        try {
          // Fallback only when direct query indicates page/block style ID.
          const response = await queryFromChildDatabase(notion, candidate, sorts);
          return { response, resolvedId: candidate };
        } catch (childError: any) {
          lastErrorMessage = String(childError?.message || lastErrorMessage);
          continue;
        }
      }

      lastErrorMessage = String(error?.message || lastErrorMessage);
    }
  }

  throw new Error(lastErrorMessage);
}

export async function POST(request: Request) {
  let attemptedIds: string[] = [];
  let resolvedIdForDebug: string | null = null;

  try {
    if (!process.env.NOTION_SECRET) {
      return NextResponse.json(
        { success: false, message: "Missing NOTION_SECRET" },
        { status: 500 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      databaseUrl?: string;
      databaseId?: string;
    };
    const urlCandidates = extractNotionIdCandidates(body?.databaseUrl);
    const pageUrlCandidates = new Set(
      String(body?.databaseUrl || "").includes("/p/") ? urlCandidates : [],
    );
    const envCandidates = extractNotionIdCandidates(process.env.NOTION_DATABASE_ID);
    const candidates = [
      ...envCandidates,
      ...extractNotionIdCandidates(body?.databaseId),
      ...urlCandidates,
    ].filter((value, index, array) => array.indexOf(value) === index);
    attemptedIds = candidates;

    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Missing NOTION_DATABASE_ID" },
        { status: 500 },
      );
    }

    // Initialize inside the handler, as requested.
    const notion = new Client({ auth: process.env.NOTION_SECRET });

    const sorts = [
      {
        timestamp: "last_edited_time" as const,
        direction: "descending" as const,
      },
    ];

    const query = await queryFromCandidates(
      notion,
      candidates,
      pageUrlCandidates,
      sorts,
    );
    const response = query.response;
    resolvedIdForDebug = query.resolvedId;
    // eslint-disable-next-line no-console
    console.log(`SYNCING DATABASE ID: ${resolvedIdForDebug ?? candidates[0] ?? "unknown"}`);

    const items = await Promise.all(
      (response.results ?? []).map(async (page: any) => {
        try {
          const properties = page?.properties ?? {};
          // eslint-disable-next-line no-console
          console.log(
            "NOTION PROPERTIES:",
            JSON.stringify(properties, null, 2),
          );
          const propEntries = Object.values(properties) as any[];
          const title =
            properties.Name?.title?.[0]?.plain_text ||
            properties.title?.title?.[0]?.plain_text ||
            properties.Name?.rich_text?.[0]?.plain_text ||
            extractTitleFromProperties(properties) ||
            "Untitled Post";

          const slugFromProperty = extractFirstByKeyMatch(properties, ["slug"]);
          const seoTitle = extractFirstByKeyMatch(properties, ["seo_title", "metatitle", "meta_title"]);
          const seoDescription = extractFirstByKeyMatch(properties, [
            "meta_description",
            "seodescription",
            "seo_description",
            "description",
          ]);
          const ogImage = extractFirstByKeyMatch(properties, ["og_image", "open_graph", "social_image"]);

          const statusProp = propEntries.find(
            (p) =>
              p?.type === "status" ||
              p?.type === "select" ||
              p?.type === "checkbox",
          );
          const publish_status =
            statusProp?.type === "status"
              ? statusProp?.status?.name || "Draft"
              : statusProp?.type === "select"
                ? statusProp?.select?.name || "Draft"
                : statusProp?.type === "checkbox"
                  ? statusProp?.checkbox
                    ? "Published"
                    : "Draft"
                  : "Draft";
          const is_published = publish_status.toLowerCase().includes("publish");

          let content = "";
          try {
            const blocks = await collectNestedBlocks(notion, page.id);
            content = extractPlainTextFromBlocks(blocks as any[]);
          } catch {
            content = "";
          }

          if (!content.trim()) {
            const propertyText = propEntries
              .map((prop: any) => {
                if (prop?.type === "rich_text" && Array.isArray(prop.rich_text)) {
                  return prop.rich_text
                    .map((t: any) => t?.plain_text || "")
                    .join("")
                    .trim();
                }
                if (prop?.type === "title" && Array.isArray(prop.title)) {
                  return prop.title
                    .map((t: any) => t?.plain_text || "")
                    .join("")
                    .trim();
                }
                return "";
              })
              .filter(Boolean)
              .join("\n");

            content = propertyText || title;
          }

          const slugSource = slugFromProperty || fallbackSlugFromPageId(page.id);

          return {
            id: page.id,
            title,
            slug: toSlug(slugSource) || fallbackSlugFromPageId(page.id),
            last_edited_time: page?.last_edited_time || null,
            publish_status,
            is_published,
            seo_title: seoTitle || title,
            seo_description: seoDescription || content.slice(0, 180),
            og_image: ogImage || null,
            content,
          };
        } catch {
          const fallbackId = String(page?.id || crypto.randomUUID());
          return {
            id: fallbackId,
            title: "Untitled Post",
            slug: fallbackSlugFromPageId(fallbackId),
            last_edited_time: page?.last_edited_time || null,
            publish_status: "Draft",
            is_published: false,
            seo_title: "Untitled Post",
            seo_description: "Untitled Post",
            og_image: null,
            content: "Untitled Post",
          };
        }
      }),
    );
    // eslint-disable-next-line no-console
    console.log(`ROWS FOUND: ${items.length}`);

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to sync Notion",
        resolvedId: resolvedIdForDebug,
        attemptedIds,
        hint: resolvedIdForDebug
          ? `Share Notion ID ${resolvedIdForDebug} with integration "Kreatly".`
          : "Share the database/page with integration \"Kreatly\" and retry.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
