import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing ANTHROPIC_API_KEY environment variable.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { content, pageId, channel, mode } = body as {
      content?: string;
      pageId?: string;
      channel?: "linkedin" | "x" | "reddit" | "seo-geo";
      mode?: "draft" | "replier" | "geo";
    };

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid content." },
        { status: 400 },
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const selectedChannel = channel ?? "linkedin";
    const isGeoMode = selectedChannel === "seo-geo" || mode === "geo";

    const channelInstruction =
      selectedChannel === "x"
        ? "Rewrite as an X/Twitter thread with exactly 5 tweets. Start tweet 1 with a hard hook. Format as 1/ through 5/, with punchy line breaks inside each tweet for readability. Keep each tweet concise and end tweet 5 with a clear CTA."
        : selectedChannel === "reddit"
          ? "Rewrite as a Reddit post in clean Markdown for r/SaaS or r/Entrepreneur. Include a strong title line, practical body sections, and a TL;DR section at the bottom."
          : selectedChannel === "seo-geo"
            ? "Rewrite for SEO/GEO discovery so AI search engines (Perplexity, Gemini, SearchGPT) can extract and rank it. Use explicit entities, query intent phrasing, high-information structure, and evidence-oriented claims."
            : "Rewrite as a high-impact LinkedIn post for startup founders and builders. Start with a high-engagement hook in the first line (contrarian insight, bold data point, or sharp question), then deliver practical value and end with a clear CTA.";
    const semanticCitationInstruction = `
Semantic Citations requirement:
- End output with a section titled "Semantic Citations".
- Provide 4-6 bullet points.
- Each bullet should name a key entity/concept from the content and why it matters for AI retrieval quality.
- Keep citations concise, factual, and intent-aware for AI engines.
- Include natural keyword variants and synonymous phrasing for better AI recall.
`.trim();

    const prompt =
      mode === "replier"
        ? `
You are an expert community strategist.
Create a high-value reply to the social media comment below.
Goal: provide genuine value and naturally create curiosity about the user's SaaS, without sounding salesy.

Rules:
- Keep it helpful, concise, and specific.
- No hype language.
- No emojis.
- End with a soft question or insight invite.

Comment:
${content}
`.trim()
        : `
You are an expert B2B ghostwriter and strategist.
${channelInstruction}

Style:
- Strong hook in first lines.
- For LinkedIn, the first line must stop the scroll immediately.
- Short mobile-friendly paragraphs.
- Clear arc: problem -> insight -> action.
- Professional and modern.
- Platform-specific formatting based on selected channel.

Constraints:
- Do not mention internal tools or prompts.
- Return only the final post text.
${isGeoMode ? semanticCitationInstruction : ""}

Raw Notion content:
${content}
`.trim();

    let claudeResponse;
    try {
      claudeResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 600,
        temperature: 0.8,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });
    } catch (error: any) {
      const message = String(error?.message ?? "");
      if (!message.includes("not_found_error")) {
        throw error;
      }

      // Fallback to currently available Sonnet model if the pinned model is unavailable.
      claudeResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        temperature: 0.8,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });
    }

    const textPieces =
      claudeResponse.content
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text) ?? [];

    const generated =
      textPieces.join("\n").trim() ||
      "Could not generate a LinkedIn post from the provided content.";

    return NextResponse.json({
      success: true,
      pageId: pageId ?? null,
      channel: selectedChannel,
      generatedContent: generated,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message ?? "Failed to generate LinkedIn post.",
      },
      { status: 500 },
    );
  }
}

