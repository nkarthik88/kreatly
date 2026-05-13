export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { adminDb } from "@/lib/firebase-admin";

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "");
}

function extractTitle(properties: any): string {
  const props = properties || {};
  const keys = Object.keys(props);

  const titleKey = keys.find((key) => props[key]?.type === "title");
  if (!titleKey) return "Untitled";

  const titleProp: any = props[titleKey];
  const titleArray = Array.isArray(titleProp?.title) ? titleProp.title : [];
  const realTitle = titleArray
    .map((t: any) => t?.plain_text || "")
    .join("")
    .trim();

  return realTitle || "Untitled";
}

function extractText(properties: any, keys: string[]): string {
  const targets = keys.map((k) => normalizeKey(k));
  for (const [key, value] of Object.entries(properties || {})) {
    if (!targets.includes(normalizeKey(key))) continue;
    const prop: any = value;
    if (prop?.type === "rich_text" && Array.isArray(prop.rich_text)) {
      return prop.rich_text.map((t: any) => t?.plain_text || "").join("").trim();
    }
    if (prop?.type === "title" && Array.isArray(prop.title)) {
      return prop.title.map((t: any) => t?.plain_text || "").join("").trim();
    }
    if (prop?.type === "formula") {
      return String(prop.formula?.string || "").trim();
    }
    if (prop?.type === "url") {
      return String(prop.url || "").trim();
    }
  }
  return "";
}

function toSlug(value: string, fallbackId: string): string {
  const base = value || fallbackId;
  return base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120) || fallbackId.replace(/-/g, "").toLowerCase();
}

function extractDate(properties: any, fallback: string | null): string | null {
  const directDate = properties?.Date?.date?.start;
  if (directDate) return directDate;
  return fallback;
}

function extractStatus(properties: any): { status: string; isPublished: boolean } {
  const statusName = properties?.Status?.select?.name;
  if (statusName) {
    return {
      status: statusName,
      isPublished: statusName.toLowerCase().includes("publish"),
    };
  }

  return { status: "Draft", isPublished: false };
}

function extractCover(page: any): string | null {
  const cover = page?.cover;
  if (!cover) return null;
  if (cover.type === "external" && cover.external?.url) {
    return cover.external.url;
  }
  if (cover.type === "file" && cover.file?.url) {
    return cover.file.url;
  }
  return null;
}

async function syncOnce() {
  const secret = process.env.NOTION_SECRET;
  const dbId = process.env.NOTION_DATABASE_ID;

  if (!secret || !dbId) {
    return NextResponse.json(
      { error: "Missing Environment Variables" },
      { status: 400 },
    );
  }

  // IMPORTANT: NOTION_DATABASE_ID should be the raw 32-character ID only.
  // Do not include the "v=..." query parameter from the Notion URL.
  // eslint-disable-next-line no-console
  console.log("Using DB ID:", dbId);

  const notion = new Client({ auth: secret });

  const notionQuery = async () => {
    const pages: any[] = [];
    let cursor: string | undefined;

    do {
      const resp: any = await notion.databases.query({
        database_id: dbId,
        page_size: 50,
        start_cursor: cursor,
      } as any);
      pages.push(...(resp.results ?? []));
      cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
    } while (cursor);

    return pages;
  };

  const notionTimeoutMs = 8000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          'Notion is taking too long. Please check if the Database ID is correct and if the "Kreatly" connection is invited to the page.',
        ),
      );
    }, notionTimeoutMs);
  });

  let pages: any[];
  try {
    pages = await Promise.race([notionQuery(), timeoutPromise]);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error("[api/notion/sync] Notion query error:", message);
    return NextResponse.json({ error: message }, { status: 504 });
  }

  // eslint-disable-next-line no-console
  console.log(`[api/notion/sync] Notion pages fetched: ${pages.length}`);

  const mapped = pages.map((page: any) => {
    const properties = page?.properties || {};
    const title = extractTitle(properties);
    const slugProp = extractText(properties, ["slug", "url slug", "permalink", "path"]);
    const slug = toSlug(slugProp || title, page.id);
    const date = extractDate(properties, page?.last_edited_time ?? null);
    const { status, isPublished } = extractStatus(properties);
    const coverImage = extractCover(page);

    return {
      id: page.id,
      title,
      slug,
      status,
      isPublished,
      date,
      coverImage,
      lastEdited: date,
    };
  });

  try {
    const batch = adminDb.batch();
    const blogsCol = adminDb.collection("blogs");
    for (const item of mapped) {
      const ref = blogsCol.doc(item.id);
      batch.set(ref, item, { merge: true });
    }
    await batch.commit();
  } catch (firestoreError) {
    // eslint-disable-next-line no-console
    console.error(
      "[api/notion/sync] Firestore batch write failed",
      firestoreError,
    );
    return NextResponse.json(
      {
        error:
          firestoreError instanceof Error
            ? firestoreError.message
            : "Failed to write to Firestore",
      },
      { status: 500 },
    );
  }

  // eslint-disable-next-line no-console
  console.log('SYNC SUCCESSFUL: Blogs saved to Firestore');
  return NextResponse.json(
    { success: true, count: mapped.length },
    { status: 200 },
  );
}

export async function POST() {
  try {
    return await syncOnce();
  } catch (error: any) {
    console.error("[api/notion/sync] Unhandled error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown backend error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return POST();
}
