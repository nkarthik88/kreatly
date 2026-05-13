import { notFound } from "next/navigation";
import { notion, fetchStaticPageBySlug } from "@/lib/notion";

type PageParams = {
  params: Promise<{ slug: string }>;
};

type StaticBlock = any;

function renderRichText(rich: any[] | undefined): string {
  if (!Array.isArray(rich)) return "";
  return rich.map((t: any) => t?.plain_text || "").join("");
}

function renderBlock(block: StaticBlock) {
  const type = block.type;
  const value = (block as any)[type];

  if (!value) return null;
  const rich = Array.isArray((value as any).rich_text) ? (value as any).rich_text : undefined;

  switch (type) {
    case "heading_1":
      return (
        <h1 key={block.id} className="mt-8">
          {renderRichText(rich)}
        </h1>
      );
    case "heading_2":
      return (
        <h2 key={block.id} className="mt-8">
          {renderRichText(rich)}
        </h2>
      );
    case "heading_3":
      return (
        <h3 key={block.id} className="mt-6">
          {renderRichText(rich)}
        </h3>
      );
    case "paragraph":
      return (
        <p key={block.id}>
          {renderRichText(rich)}
        </p>
      );
    case "bulleted_list_item":
      return (
        <li key={block.id} className="list-disc">
          {renderRichText(rich)}
        </li>
      );
    case "numbered_list_item":
      return (
        <li key={block.id} className="list-decimal">
          {renderRichText(rich)}
        </li>
      );
    case "quote":
      return (
        <blockquote key={block.id}>
          {renderRichText(rich)}
        </blockquote>
      );
    default:
      return null;
  }
}

export default async function StaticPage({ params }: PageParams) {
  const { slug } = await params;

  try {
    // eslint-disable-next-line no-console
    console.log("🔍 [StaticPage] Incoming slug param:", slug);

    const pageMeta = await fetchStaticPageBySlug(slug);
    if (!pageMeta) {
      notFound();
    }

    const blocks: any[] = [];
    let cursor: string | undefined;
    do {
      const chunk: any = await notion.blocks.children.list({
        block_id: pageMeta.id,
        page_size: 100,
        start_cursor: cursor,
      });
      blocks.push(...(chunk.results ?? []));
      cursor = chunk.has_more ? chunk.next_cursor ?? undefined : undefined;
    } while (cursor);

    // eslint-disable-next-line no-console
    console.log("✅ [StaticPage] Rendering static page:", pageMeta.slug);

    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {pageMeta.title}
          </h1>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-10">
            <div className="prose prose-lg max-w-3xl mx-auto prose-zinc dark:prose-invert prose-headings:font-semibold prose-p:text-zinc-700 prose-a:text-sky-600 prose-a:no-underline hover:prose-a:underline prose-li:my-1">
              {blocks.map((block) => renderBlock(block))}
            </div>
          </div>
        </article>
      </main>
    );
  } catch {
    notFound();
  }
}

