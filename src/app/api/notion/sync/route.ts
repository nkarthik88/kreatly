import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "");
}

function extractTitle(properties: any): string {
  const candidates = ["title", "name"];
  for (const key of Object.keys(properties || {})) {
    const value = (properties as any)[key];
    if (value?.type === "title" && candidates.includes(normalizeKey(key))) {
      return (value.title || [])
        .map((t: any) => t?.plain_text || "")
        .join("")
        .trim();
    }
  }
  for (const value of Object.values(properties || {})) {
    if ((value as any)?.type === "title") {
      return ((value as any).title || [])
        .map((t: any) => t?.plain_text || "")
        .join("")
        .trim();
    }
  }
  return "Untitled";
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

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function extractDate(properties: any): string | null {
  const preferred = ["date", "published", "publishedat", "publishdate"];
  for (const [key, value] of Object.entries(properties || {})) {
    const prop: any = value;
    if (prop?.type !== "date" || !prop.date?.start) continue;
    if (preferred.includes(normalizeKey(key))) {
      return prop.date.start;
    }
  }
  for (const value of Object.values(properties || {})) {
    const prop: any = value;
    if (prop?.type === "date" && prop.date?.start) {
      return prop.date.start;
    }
  }
  return null;
}

function extractStatus(properties: any): { status: string; isPublished: boolean } {
  for (const value of Object.values(properties || {})) {
    const prop: any = value;
    if (prop?.type === "status" && prop.status?.name) {
      const status = String(prop.status.name);
      return { status, isPublished: status.toLowerCase().includes("publish") };
    }
    if (prop?.type === "select" && prop.select?.name) {
      const status = String(prop.select.name);
      return { status, isPublished: status.toLowerCase().includes("publish") };
    }
    if (prop?.type === "checkbox") {
      const checked = Boolean(prop.checkbox);
      return { status: checked ? "Published" : "Draft", isPublished: checked };
    }
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

export async function POST(request: Request) {
  try {
    const secret = process.env.NOTION_SECRET;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!secret || !databaseId) {
      return NextResponse.json(
        { success: false, message: "Missing Notion Credentials" },
        { status: 400 },
      );
    }

    const notion = new Client({ auth: secret });
    const allPages: any[] = [];
    let cursor: string | undefined = undefined;

    // Fetch all pages from the Notion database with pagination.
    do {
      const response: any = await notion.databases.query({
        database_id: databaseId,
        page_size: 50,
        start_cursor: cursor,
      } as any);

      allPages.push(...(response.results ?? []));
      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);

    const blogsCollection = collection(db, "blogs");
    let syncedCount = 0;

    await Promise.all(
      allPages.map(async (page: any) => {
        const properties = page?.properties || {};
        const title = extractTitle(properties);
        const slugProp =
          extractText(properties, ["Slug", "slug", "URL Slug"]) || toSlug(title || page.id);
        const date = extractDate(properties) ?? page?.last_edited_time ?? null;
        const { status, isPublished } = extractStatus(properties);
        const coverImage = extractCover(page);

        const docRef = doc(blogsCollection, page.id);
        await setDoc(
          docRef,
          {
            id: page.id,
            title,
            slug: slugProp,
            status,
            isPublished,
            date,
            coverImage,
            lastEdited: page?.last_edited_time ?? null,
            seoTitle: title,
            seoDescription: "",
            content: "",
            syncedAt: serverTimestamp(),
          },
          { merge: true },
        );

        syncedCount += 1;
      }),
    );

    return NextResponse.json(
      {
        success: true,
        count: syncedCount,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to sync Notion data.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
