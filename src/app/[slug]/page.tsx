import { notFound } from "next/navigation";
import Link from "next/link";
import { notion, fetchStaticPageBySlug } from "@/lib/notion";
import SubscribeBox from "@/app/blog/_components/SubscribeBox";

type PageParams = {
  params: Promise<{ slug: string }>;
};

type StaticBlock = any;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function renderRichText(rich: any[] | undefined): React.ReactNode {
  if (!Array.isArray(rich) || rich.length === 0) return null;
  return rich.map((t: any, i: number) => {
    const text = t?.plain_text || "";
    if (!text) return null;
    const ann = t?.annotations || {};
    const href = t?.href;
    let node: React.ReactNode = text;
    if (ann.code) node = <code key={i} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm text-zinc-800">{text}</code>;
    if (ann.bold) node = <strong key={i}>{node}</strong>;
    if (ann.italic) node = <em key={i}>{node}</em>;
    if (ann.strikethrough) node = <s key={i}>{node}</s>;
    if (ann.underline) node = <span key={i} className="underline">{node}</span>;
    if (href) node = <a key={i} href={href} target="_blank" rel="noreferrer" className="text-zinc-900 underline underline-offset-2 hover:text-zinc-600">{node}</a>;
    return <span key={i}>{node}</span>;
  });
}

function renderBlock(block: StaticBlock): React.ReactNode {
  const type = block.type;
  const value = (block as any)[type];
  if (!value) return null;
  const rich = Array.isArray((value as any).rich_text) ? (value as any).rich_text : undefined;

  switch (type) {
    case "heading_1":
      return <h1 key={block.id} className="mt-8 text-2xl font-bold text-zinc-900">{renderRichText(rich)}</h1>;
    case "heading_2":
      return <h2 key={block.id} className="mt-8 text-xl font-bold text-zinc-900">{renderRichText(rich)}</h2>;
    case "heading_3":
      return <h3 key={block.id} className="mt-6 text-lg font-semibold text-zinc-800">{renderRichText(rich)}</h3>;
    case "paragraph": {
      const content = renderRichText(rich);
      return <p key={block.id} className="my-3 leading-7 text-zinc-600">{content || <br />}</p>;
    }
    case "bulleted_list_item":
      return <li key={block.id} className="ml-6 list-disc leading-7 text-zinc-600">{renderRichText(rich)}</li>;
    case "numbered_list_item":
      return <li key={block.id} className="ml-6 list-decimal leading-7 text-zinc-600">{renderRichText(rich)}</li>;
    case "quote":
      return (
        <blockquote key={block.id} className="my-4 border-l-4 border-zinc-200 pl-4 italic text-zinc-500">
          {renderRichText(rich)}
        </blockquote>
      );
    case "code": {
      const lang = value?.language || "";
      const codeText = Array.isArray(value?.rich_text)
        ? value.rich_text.map((t: any) => t?.plain_text || "").join("")
        : "";
      return (
        <pre key={block.id} className="my-4 overflow-x-auto rounded-lg border border-zinc-100 bg-zinc-50 px-5 py-4 text-sm text-zinc-800">
          <code data-language={lang}>{codeText}</code>
        </pre>
      );
    }
    case "image": {
      const src = value?.external?.url ?? value?.file?.url ?? null;
      const caption = Array.isArray(value?.caption)
        ? value.caption.map((t: any) => t?.plain_text || "").join("").trim()
        : "";
      if (!src) return null;
      return (
        <figure key={block.id} className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={caption || "image"} className="w-full rounded-lg object-cover" />
          {caption ? <figcaption className="mt-2 text-center text-xs text-zinc-400">{caption}</figcaption> : null}
        </figure>
      );
    }
    case "callout": {
      const emoji = value?.icon?.emoji || "💡";
      return (
        <div key={block.id} className="my-4 flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <span>{emoji}</span>
          <p className="leading-7 text-zinc-600">{renderRichText(rich)}</p>
        </div>
      );
    }
    case "divider":
      return <hr key={block.id} className="my-8 border-zinc-100" />;
    case "toggle":
      return (
        <details key={block.id} className="my-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2">
          <summary className="cursor-pointer font-medium text-zinc-700">{renderRichText(rich)}</summary>
        </details>
      );
    default:
      return null;
  }
}

export default async function StaticPage({ params }: PageParams) {
  const { slug } = await params;

  try {
    // eslint-disable-next-line no-console
    console.log("[StaticPage] Incoming slug:", slug);

    // Try the slug exactly as received first, then a normalized form.
    let pageMeta = await fetchStaticPageBySlug(slug);
    if (!pageMeta) {
      const normalized = toSlug(decodeURIComponent(slug));
      if (normalized !== slug) {
        pageMeta = await fetchStaticPageBySlug(normalized);
      }
    }

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
    console.log("[StaticPage] Rendered:", pageMeta.slug, "— blocks:", blocks.length);

    return (
      <main className="min-h-screen bg-white px-4 py-12 text-zinc-900 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-6 inline-block text-[13px] text-zinc-400 transition-colors hover:text-zinc-700"
          >
            ← Back
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {pageMeta.title}
          </h1>

          <div className="mt-8">
            {blocks.length > 0
              ? blocks.map((block) => renderBlock(block))
              : <p className="text-[13px] italic text-zinc-400">No content yet.</p>
            }
          </div>
        </article>

        <SubscribeBox />
      </main>
    );
  } catch {
    notFound();
  }
}
