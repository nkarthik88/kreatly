import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MappingState = {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  geoKeywords: string;
  geoFocus: string;
  publishStatus: string;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, "_");
}

function extractNotionIdFromInput(input: string): string | null {
  const candidates = extractNotionIdCandidates(input);
  return candidates[0] ?? null;
}

function extractNotionIdCandidates(input: string): string[] {
  const raw = input.trim();
  if (!raw) return [];

  const candidates: string[] = [];
  const pushCandidate = (value?: string | null) => {
    if (!value) return;
    const normalized = value.replace(/-/g, "").toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(normalized)) return;
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  pushCandidate(raw.replace(/-/g, ""));

  try {
    const url = new URL(raw);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const tailSegment = pathSegments[pathSegments.length - 1] ?? "";
    const tailMatches = tailSegment.match(/[a-f0-9]{32}/gi) ?? [];
    tailMatches.forEach((match) => pushCandidate(match));
  } catch {}

  const matches = raw.match(/[a-f0-9]{32}/gi) ?? [];
  matches.forEach((match) => pushCandidate(match));
  return candidates;
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

async function resolveDataSourceId(notion: Client, inputId: string): Promise<string> {
  try {
    await notion.dataSources.retrieve({ data_source_id: inputId });
    return inputId;
  } catch {}

  try {
    const database: any = await notion.databases.retrieve({ database_id: inputId });
    return database?.data_sources?.[0]?.id || inputId;
  } catch {}

  const nested = await collectNestedBlocks(notion, inputId);
  const childDatabase = nested.find((block: any) => block?.type === "child_database");
  const childDatabaseId: string | undefined = childDatabase?.id;
  if (!childDatabaseId) {
    throw new Error("No child database found in the provided Notion page.");
  }
  try {
    const childDb: any = await notion.databases.retrieve({
      database_id: childDatabaseId,
    });
    return childDb?.data_sources?.[0]?.id || childDatabaseId;
  } catch {
    return childDatabaseId;
  }
}

async function resolveDataSourceIdFromCandidates(
  notion: Client,
  candidates: string[],
): Promise<string> {
  let lastErrorMessage = "Could not resolve Notion database/data source ID.";

  for (const candidate of candidates) {
    try {
      return await resolveDataSourceId(notion, candidate);
    } catch (error: any) {
      lastErrorMessage = String(error?.message || lastErrorMessage);
    }
  }

  throw new Error(lastErrorMessage);
}

function mapDetectedProperties(propertyNames: string[]): {
  mappings: MappingState;
  autoSkip: boolean;
} {
  const normalized = propertyNames.map((name) => normalize(name));
  const find = (candidates: string[], fallback: string) =>
    propertyNames[
      normalized.findIndex((name) =>
        candidates.some((candidate) => name.includes(candidate)),
      )
    ] ?? fallback;

  const mappings: MappingState = {
    slug: find(["slug"], "slug"),
    seoTitle: find(["seo_title", "seo", "meta_title"], "seo_title"),
    metaDescription: find(
      ["meta_description", "description", "meta_desc"],
      "meta_description",
    ),
    geoKeywords: find(["geo_keywords", "keywords"], "geo_keywords"),
    geoFocus: find(["geo_focus", "focus"], "geo_focus"),
    publishStatus: find(["publish_status", "status"], "publish_status"),
  };

  const hasSlug = normalized.some((name) => name === "slug");
  const hasStatus = normalized.some((name) => name === "status");
  const hasGeoFocus = normalized.some((name) => name === "geo_focus");

  return { mappings, autoSkip: hasSlug && hasStatus && hasGeoFocus };
}

function collectMappablePropertiesFromObject(source: Record<string, any>): string[] {
  const allowedTypes = new Set(["title", "rich_text", "select", "status"]);
  return Object.entries(source)
    .filter(([, value]) => allowedTypes.has(String(value?.type || "")))
    .map(([name]) => name);
}

export async function POST(request: Request) {
  try {
    const notionSecret = process.env.NOTION_SECRET;
    if (!notionSecret) {
      return NextResponse.json(
        { success: false, message: "Missing NOTION_SECRET." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { notionUrl?: string };
    const candidates = [
      ...extractNotionIdCandidates(body?.notionUrl || ""),
      ...extractNotionIdCandidates(String(process.env.NOTION_DATABASE_ID || "")),
    ].filter((value, index, array) => array.indexOf(value) === index);

    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Missing Notion Database URL/ID." },
        { status: 400 },
      );
    }

    const notion = new Client({ auth: notionSecret });
    const dataSourceId = await resolveDataSourceIdFromCandidates(
      notion,
      candidates,
    );
    const discovered = new Set<string>();

    try {
      const dataSource: any = await notion.dataSources.retrieve({
        data_source_id: dataSourceId,
      });
      const props = dataSource?.properties ?? {};
      collectMappablePropertiesFromObject(props).forEach((name) =>
        discovered.add(name),
      );
    } catch {
      const database: any = await notion.databases.retrieve({
        database_id: dataSourceId,
      });
      const props = database?.properties ?? {};
      collectMappablePropertiesFromObject(props).forEach((name) =>
        discovered.add(name),
      );
    }

    try {
      const sample: any = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 10,
      });
      for (const row of sample?.results ?? []) {
        const props = row?.properties ?? {};
        collectMappablePropertiesFromObject(props).forEach((name) =>
          discovered.add(name),
        );
      }
    } catch {
      // Keep discovered properties if data source query is unavailable.
    }

    const propertyNames = Array.from(discovered);
    const { mappings, autoSkip } = mapDetectedProperties(propertyNames);

    return NextResponse.json(
      {
        success: true,
        databaseId: dataSourceId,
        propertyNames,
        mappings,
        autoSkip,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to scan Notion schema.",
      },
      { status: 500 },
    );
  }
}
