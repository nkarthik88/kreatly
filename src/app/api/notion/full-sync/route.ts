import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

type Mapping = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  tags?: string[];
  authors?: string[];
  cover?: string | null;
  ogImage?: string | null;
  metaTitle?: string;
  metaDescription?: string;
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "");
}

function extractTitle(properties: any): string {
  const candidates = ["title", "name"];
  for (const key of Object.keys(properties || {})) {
    const value = properties[key];
    if (value?.type === "title" && candidates.includes(normalizeKey(key))) {
      return (value.title || [])
        .map((t: any) => t?.plain_text || "")
        .join("")
        .trim();
    }
  }
  // fallback to first title property
  for (const value of Object.values(properties || {})) {
    if (value?.type === "title") {
      return (value.title || [])
        .map((t: any) => t?.plain_text || "")
        .join("")
        .trim();
    }
  }
  return "Untitled";
}

function extractTextProperty(properties: any, keys: string[]): string {
  const normalizedTargets = keys.map((k) => normalizeKey(k));
  for (const [key, value] of Object.entries(properties || {})) {
    if (!normalizedTargets.includes(normalizeKey(key))) continue;
    if (value?.type === "rich_text" && Array.isArray(value.rich_text)) {
      return value.rich_text.map((t: any) => t?.plain_text || "").join("").trim();
    }
    if (value?.type === "title" && Array.isArray(value.title)) {
      return value.title.map((t: any) => t?.plain_text || "").join("").trim();
    }
    if (value?.type === "formula") {
      return String(value.formula?.string || "").trim();
    }
    if (value?.type === "url") {
      return String(value.url || "").trim();
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

async function syncDatabase(notion: Client, databaseId: string): Promise<Mapping[]> {
  const results: Mapping[] = [];
  const response: any = await notion.databases.query({
    database_id: databaseId,
    page_size: 50,
  } as any);

  for (const page of response.results ?? []) {
    const props = page.properties || {};
    const title = extractTitle(props);
    const slug =
      extractTextProperty(props, ["Slug", "slug", "URL Slug"]) || toSlug(title || page.id);
    const excerpt =
      extractTextProperty(props, ["Excerpt", "Summary", "Description"]) || undefined;

    const tagsProp = Object.values(props || {}).find(
      (p: any) => p?.type === "multi_select" || p?.type === "select",
    ) as any;
    const tags =
      tagsProp?.type === "multi_select"
        ? (tagsProp.multi_select || []).map((t: any) => t?.name || "").filter(Boolean)
        : tagsProp?.type === "select" && tagsProp.select?.name
          ? [tagsProp.select.name]
          : [];

    const authorsText =
      extractTextProperty(props, ["Author", "Authors", "Writer"]) || undefined;
    const authors = authorsText ? authorsText.split(/,|\n/).map((s) => s.trim()) : [];

    const metaTitle =
      extractTextProperty(props, ["Meta Title", "SEO Title", "seo_title"]) || title;
    const metaDescription =
      extractTextProperty(props, ["Meta Description", "SEO Description"]) || excerpt;

    results.push({
      id: page.id,
      title,
      slug,
      excerpt,
      tags,
      authors,
      cover: null,
      ogImage: null,
      metaTitle,
      metaDescription,
    });
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const { uid } = (await request.json()) as { uid?: string };
    if (!uid) {
      return NextResponse.json({ success: false, message: "Missing uid" }, { status: 400 });
    }

    if (!process.env.NOTION_SECRET) {
      return NextResponse.json(
        { success: false, message: "Missing NOTION_SECRET" },
        { status: 500 },
      );
    }

    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return NextResponse.json(
        { success: false, message: "User settings not found." },
        { status: 404 },
      );
    }

    const data = snap.data() as any;
    const contentUrl: string | undefined = data?.notionUrl;
    if (!contentUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing Notion URL. Set it in Voice DNA Settings first.",
        },
        { status: 400 },
      );
    }

    const notion = new Client({ auth: process.env.NOTION_SECRET });

    // Simple ID extraction for now — expects a database URL or raw id
    const match = contentUrl.replace(/-/g, "").match(/[a-f0-9]{32}/i);
    if (!match) {
      return NextResponse.json(
        { success: false, message: "Could not extract Notion database id from URL." },
        { status: 400 },
      );
    }
    const databaseId = match[0];

    const posts = await syncDatabase(notion, databaseId);

    const postsCol = collection(userRef, "posts");
    await Promise.all(
      posts.map((post) =>
        setDoc(
          doc(postsCol, post.id),
          {
            ...post,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      ),
    );

    await setDoc(
      userRef,
      {
        lastSynced: serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({
      success: true,
      counts: {
        posts: posts.length,
        pages: 0,
        tags: 0,
        authors: 0,
      },
    });
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

