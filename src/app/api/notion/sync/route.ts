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
  // Notion property names are case-sensitive; check common variants.
  const statusProp =
    properties?.Status ??
    properties?.status ??
    properties?.["Publication Status"] ??
    properties?.["Publish Status"] ??
    null;

  const statusName =
    statusProp?.select?.name ??
    statusProp?.status?.name ??
    null;

  if (statusName) {
    return {
      status: statusName,
      isPublished: statusName.toLowerCase().includes("publish"),
    };
  }

  // Fall back to checking a checkbox property named Published / published.
  const checkboxProp =
    properties?.Published ??
    properties?.published ??
    null;
  if (typeof checkboxProp?.checkbox === "boolean") {
    return {
      status: checkboxProp.checkbox ? "Published" : "Draft",
      isPublished: checkboxProp.checkbox,
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

// ── Resolve creds from Firestore first, env vars as fallback ─────────────────
async function resolveSyncCreds(): Promise<{ secret: string; dbId: string } | null> {
  try {
    const sitesSnap = await adminDb.collection("sites").limit(5).get();
    for (const siteDoc of sitesSnap.docs) {
      const d = siteDoc.data();
      const secret: string | undefined =
        d.notionApiKey ?? d.notionToken ?? d.notion_token ?? d.notionSecret ?? undefined;
      const dbId: string | undefined =
        d.blogDbId ?? d.notionDatabaseId ?? d.notion_database_id ?? undefined;
      if (secret && dbId) {
        console.log(`[api/notion/sync] Creds from Firestore sites/${siteDoc.id} — dbId: ${dbId}`);
        return { secret, dbId };
      }
    }
  } catch (err) {
    console.warn("[api/notion/sync] Could not read sites collection:", err);
  }

  const secret = process.env.NOTION_SECRET ?? process.env.NOTION_TOKEN ?? process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID ?? process.env.NOTION_DB_ID;
  if (secret && dbId) {
    console.log(`[api/notion/sync] Creds from env vars — dbId: ${dbId}`);
    return { secret, dbId };
  }

  return null;
}

// ── Delete all docs in a collection in batches of 400 ─────────────────────────
async function deleteCollection(collectionPath: string): Promise<number> {
  let deleted = 0;
  let snap = await adminDb.collection(collectionPath).limit(400).get();
  while (!snap.empty) {
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.docs.length;
    snap = await adminDb.collection(collectionPath).limit(400).get();
  }
  return deleted;
}

async function syncOnce() {
  const creds = await resolveSyncCreds();
  if (!creds) {
    console.error("[api/notion/sync] ❌ No Notion credentials found. Save your API key in the dashboard settings.");
    return NextResponse.json(
      { error: "No Notion credentials found. Save your API key in the dashboard settings." },
      { status: 400 },
    );
  }

  const { secret, dbId } = creds;
  console.log(`[api/notion/sync] Using DB ID: ${dbId}`);

  const notion = new Client({ auth: secret });

  // ── Step 1: Fetch all pages from Notion ──────────────────────────────────
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

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Notion is taking too long. Check your Database ID and ensure the Kreatly integration is invited to the page.')), 12000),
  );

  let pages: any[];
  try {
    pages = await Promise.race([notionQuery(), timeoutPromise]);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/notion/sync] Notion query error:", message);
    return NextResponse.json({ error: message }, { status: 504 });
  }

  console.log(`[api/notion/sync] Notion pages fetched: ${pages.length}`);

  const mapped = pages.map((page: any) => {
    const properties = page?.properties || {};
    const title = extractTitle(properties);
    const slugProp = extractText(properties, ["slug", "url slug", "permalink", "path"]);
    const slug = toSlug(slugProp || title, page.id);
    const date = extractDate(properties, page?.last_edited_time ?? null);
    const { status, isPublished } = extractStatus(properties);
    const coverImage = extractCover(page);
    const notionPageId = page.id; // canonical Notion page ID used as storyId

    console.log('SYNCING: Title:', title, 'New ID:', notionPageId);

    return {
      id: notionPageId,
      title,
      slug,
      status,
      isPublished,
      date,
      coverImage,
      lastEdited: date,
    };
  });

  // ── Step 2: Snapshot existing publicPosts so we can rebuild them ──────────
  let publishedSlugs: Map<string, any> = new Map();
  try {
    const pubSnap = await adminDb.collection("publicPosts").get();
    for (const d of pubSnap.docs) {
      const data = d.data();
      if (data.isPublished) {
        publishedSlugs.set(data.slug ?? d.id, data);
      }
    }
    console.log(`[api/notion/sync] Snapshotted ${publishedSlugs.size} published publicPosts before reset`);
  } catch (err) {
    console.warn("[api/notion/sync] Could not snapshot publicPosts:", err);
  }

  // ── Step 3: Nuclear reset — wipe publicPosts and blogs ───────────────────
  try {
    const [deletedPublic, deletedBlogs] = await Promise.all([
      deleteCollection("publicPosts"),
      deleteCollection("blogs"),
    ]);
    console.log(`[api/notion/sync] Deleted ${deletedPublic} publicPosts, ${deletedBlogs} blogs`);
  } catch (err) {
    console.error("[api/notion/sync] ❌ Delete failed:", err);
    return NextResponse.json({ error: "Failed to reset collections before sync" }, { status: 500 });
  }

  // ── Step 4: Write fresh blogs docs ───────────────────────────────────────
  try {
    const blogsCol = adminDb.collection("blogs");
    for (let i = 0; i < mapped.length; i += 400) {
      const batch = adminDb.batch();
      mapped.slice(i, i + 400).forEach((item) => {
        batch.set(blogsCol.doc(item.id), item);
      });
      await batch.commit();
    }
    console.log(`[api/notion/sync] Wrote ${mapped.length} fresh blog docs`);
  } catch (err) {
    console.error("[api/notion/sync] ❌ blogs write failed:", err);
    return NextResponse.json({ error: "Failed to write blogs after sync" }, { status: 500 });
  }

  // ── Step 5: Rebuild publicPosts for previously-published slugs ────────────
  const rebuildErrors: string[] = [];
  for (const item of mapped) {
    const prevData = publishedSlugs.get(item.slug);
    if (!prevData) continue; // was not published before — skip

    try {
      await adminDb.collection("publicPosts").doc(item.slug).set({
        ...prevData,          // preserve title, seoTitle, seoDescription, ogImage, siteId, etc.
        storyId: item.id,    // ← fresh correct Notion page ID
        slug: item.slug,
        isPublished: true,
        updatedAt: new Date().toISOString(),
      });
      console.log(`[api/notion/sync] Rebuilt publicPost for slug="${item.slug}" storyId="${item.id}"`);
    } catch (err) {
      const msg = `Failed to rebuild publicPost for "${item.slug}": ${err instanceof Error ? err.message : String(err)}`;
      console.error("[api/notion/sync]", msg);
      rebuildErrors.push(msg);
    }
  }

  console.log(`[api/notion/sync] SYNC COMPLETE — ${mapped.length} blogs, ${publishedSlugs.size} publicPosts rebuilt`);
  return NextResponse.json({
    success: true,
    count: mapped.length,
    publishedRebuilt: publishedSlugs.size,
    rebuildErrors: rebuildErrors.length ? rebuildErrors : undefined,
  });
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
