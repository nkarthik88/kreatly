import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("pageId");

  if (!pageId) {
    return NextResponse.json(
      { success: false, message: "Missing pageId query parameter." },
      { status: 400 },
    );
  }

  try {
    const token = process.env.NOTION_SECRET;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Missing NOTION_SECRET environment variable." },
        { status: 500 },
      );
    }
    const notion = new Client({ auth: token });

    const blocks = await collectNestedBlocks(notion, pageId);
    const content = extractPlainTextFromBlocks(blocks as any[]);

    return NextResponse.json({
      success: true,
      pageId,
      content,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message ?? "Failed to load page content.",
      },
      { status: 500 },
    );
  }
}

