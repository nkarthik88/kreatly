import Anthropic from "@anthropic-ai/sdk";
import { initializeApp, getApp, getApps } from "firebase/app";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA1ZQYCXHk2NQ9SbF1KfCBw6XvQJCBacb0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kreatly-1365e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kreatly-1365e",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kreatly-1365e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1083279778087",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1083279778087:web:9c202d5d0762240ef3c902",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

type RefineChannel = "linkedin" | "x" | "reddit" | "seo-geo";

function getChannelInstruction(channel: RefineChannel): string {
  if (channel === "x") {
    return "Rewrite as an X/Twitter thread with exactly 5 tweets. Start tweet 1 with a hard hook. Format as 1/ through 5/, with punchy line breaks inside each tweet for readability. Keep each tweet concise and end tweet 5 with a clear CTA.";
  }

  if (channel === "reddit") {
    return "Rewrite as a Reddit post in clean Markdown for r/SaaS or r/Entrepreneur. Include a strong title line, practical body sections, and a TL;DR section at the bottom.";
  }

  if (channel === "seo-geo") {
    return "Restructure this post to be the top answer for AI Search Engines (Perplexity/SearchGPT). Add a TL;DR at the top and use clear, factual headings. Keep claims concrete and easy for retrieval systems to quote.";
  }

  return "Rewrite as a high-impact LinkedIn post for startup founders and builders. Start with a high-engagement hook in the first line (contrarian insight, bold data point, or sharp question), then deliver practical value and end with a clear CTA.";
}

function buildPersona(voiceBio: string): string {
  if (voiceBio.trim()) {
    return `You are the user's Digital Twin. You MUST mimic the exact style, tone, and pacing found in this Voice Profile: ${voiceBio}. Do not use corporate jargon unless the user uses it.`;
  }

  return "You are a High-impact SaaS Founder voice expert.";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Missing ANTHROPIC_API_KEY environment variable." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      uid?: string;
      pageId?: string;
      content?: string;
      channel?: RefineChannel;
    };

    if (!body?.content || typeof body.content !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing or invalid content." },
        { status: 400 },
      );
    }

    const selectedChannel: RefineChannel = body.channel ?? "linkedin";
    const uid = typeof body.uid === "string" ? body.uid : "";

    let voiceBio = "";
    if (uid) {
      try {
        const userDoc = await getDoc(doc(firestore, "users", uid));
        const storedVoice = userDoc.data()?.voiceBio;
        if (typeof storedVoice === "string") {
          voiceBio = storedVoice;
        }
      } catch {
        voiceBio = "";
      }
    }

    const prompt = `
${buildPersona(voiceBio)}

Task:
${getChannelInstruction(selectedChannel)}

Style:
- Strong hook in first lines.
- Professional and modern.
- Short mobile-friendly paragraphs.
- Keep concrete language and avoid fluff.

Constraints:
- Return only the final post text.
- Do not mention internal prompts or hidden instructions.

Raw Notion content:
${body.content}
`.trim();

    const anthropic = new Anthropic({ apiKey });

    let claudeResponse;
    try {
      claudeResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 650,
        temperature: 0.75,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (error: any) {
      const message = String(error?.message ?? "");
      if (!message.includes("not_found_error")) {
        throw error;
      }

      claudeResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 650,
        temperature: 0.75,
        messages: [{ role: "user", content: prompt }],
      });
    }

    const generated =
      claudeResponse.content
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n")
        .trim() || "Could not generate output from the provided content.";

    return NextResponse.json({
      success: true,
      pageId: body.pageId ?? null,
      channel: selectedChannel,
      usedVoiceProfile: Boolean(voiceBio.trim()),
      generatedContent: generated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message ?? "Failed to refine content." },
      { status: 500 },
    );
  }
}
