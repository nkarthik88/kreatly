import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

type PromptType = "linkedin" | "twitter";

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

    const body = (await request.json()) as {
      promptType?: PromptType;
      blogContent?: string;
    };

    const promptType: PromptType = body.promptType ?? "linkedin";
    const blogContent = body.blogContent;

    if (!blogContent || typeof blogContent !== "string" || !blogContent.trim()) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid blogContent." },
        { status: 400 },
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `
You are an expert SaaS copywriter.
Turn the provided blog content into a high-converting, engaging ${promptType} post.

Requirements:
- Keep it punchy and specific.
- Use platform-appropriate formatting and (light) emojis.
- Do not use generic AI buzzwords.
- Do not mention that you are an AI or that this was generated.
`.trim();

    const userPrompt = `
Here is the raw blog content to repurpose:

${blogContent}
`.trim();

    let claudeResponse;
    try {
      claudeResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 650,
        temperature: 0.8,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
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
        max_tokens: 650,
        temperature: 0.8,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });
    }

    const generated =
      claudeResponse.content
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n")
        .trim() || "Could not generate a post from the provided content.";

    return NextResponse.json({
      success: true,
      promptType,
      generatedContent: generated,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message ?? "Failed to generate repurposed post.",
      },
      { status: 500 },
    );
  }
}

