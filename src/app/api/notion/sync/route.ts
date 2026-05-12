export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "");
}

function extractTitle(properties: any): string {
  const entries = Object.entries(properties || {});
  const preferredKeys = ["title", "name"];

  for (const [key, value] of entries) {
    const prop: any = value;
    if (
      prop?.type === "title" &&
      preferredKeys.includes(normalizeKey(key))
    ) {
      return (
        prop.title
          ?.map((t: any) => t?.plain_text || "")
          .join("")
          .trim() || "Untitled"
      );
    }
  }

  for (const [, value] of entries) {
    const prop: any = value;
    if (prop?.type === "title") {
      return (
        prop.title
          ?.map((t: any) => t?.plain_text || "")
          .join("")
          .trim() || "Untitled"
      );
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
  return fallback;
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

export async function POST() {
  try {
    const secret = process.env.NOTION_SECRET;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!secret || !databaseId) {
      return NextResponse.json(
        { error: "Missing Environment Variables" },
        { status: 400 },
      );
    }

    const notion = new Client({ auth: secret });
    const pages: any[] = [];
    let cursor: string | undefined;

    do {
      const resp: any = await notion.databases.query({
        database_id: databaseId,
        page_size: 50,
        start_cursor: cursor,
      } as any);
      pages.push(...(resp.results ?? []));
      cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
    } while (cursor);

    console.log(`[api/notion/sync] Notion pages fetched: ${pages.length}`);

    const mapped = pages.map((page: any) => {
      const properties = page?.properties || {};
      const title = extractTitle(properties);
      const slugProp = extractText(properties, ["Slug", "slug", "URL Slug"]);
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

    // Fast concurrent Firestore write via batch
    try {
      const batch = writeBatch(db);
      const blogsCol = collection(db, "blogs");
      for (const item of mapped) {
        const ref = doc(blogsCol, item.id);
        batch.set(ref, item, { merge: true });
      }
      await batch.commit();
    } catch (firestoreError) {
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

    return NextResponse.json(
      { success: true, count: mapped.length },
      { status: 200 },
    );
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
