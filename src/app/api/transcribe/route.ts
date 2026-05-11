import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function resolveDataSourceId(
  notion: Client,
  databaseOrDataSourceId: string,
): Promise<string> {
  try {
    await notion.dataSources.retrieve({ data_source_id: databaseOrDataSourceId });
    return databaseOrDataSourceId;
  } catch {
    const database: any = await notion.databases.retrieve({
      database_id: databaseOrDataSourceId,
    });
    const dataSourceId = database?.data_sources?.[0]?.id;
    if (!dataSourceId) {
      throw new Error("Could not resolve Notion data source for STORIES database.");
    }
    return dataSourceId;
  }
}

function splitIntoParagraphChildren(text: string): Array<Record<string, any>> {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: "No transcript text." } }],
        },
      },
    ];
  }

  return lines.slice(0, 100).map((line) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: line.slice(0, 1900) } }],
    },
  }));
}

export async function POST(request: Request) {
  try {
    const openAiKey = process.env.OPENAI_API_KEY;
    const notionSecret = process.env.NOTION_SECRET;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;

    if (!openAiKey) {
      return NextResponse.json(
        { success: false, message: "Missing OPENAI_API_KEY environment variable." },
        { status: 500 },
      );
    }
    if (!notionSecret || !notionDatabaseId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing NOTION_SECRET or NOTION_DATABASE_ID environment variable.",
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Missing audio file." },
        { status: 400 },
      );
    }

    const whisperForm = new FormData();
    whisperForm.append("file", file);
    whisperForm.append("model", "whisper-1");

    const transcriptionResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
        },
        body: whisperForm,
      },
    );

    const transcriptionData: any = await transcriptionResponse.json();
    if (!transcriptionResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            transcriptionData?.error?.message || "Failed to transcribe audio.",
        },
        { status: 500 },
      );
    }

    const transcript = String(transcriptionData?.text || "").trim();
    if (!transcript) {
      return NextResponse.json(
        { success: false, message: "Whisper returned an empty transcript." },
        { status: 500 },
      );
    }

    const notion = new Client({ auth: notionSecret });
    const dataSourceId = await resolveDataSourceId(notion, notionDatabaseId);
    const title = file.name.replace(/\.[^/.]+$/, "") || "Interview Draft";

    let createdPage: any;
    try {
      createdPage = await notion.pages.create({
        parent: {
          data_source_id: dataSourceId,
        } as any,
        properties: {
          title: {
            title: [{ type: "text", text: { content: title.slice(0, 120) } }],
          },
        } as any,
        children: splitIntoParagraphChildren(transcript),
      } as any);
    } catch {
      createdPage = await notion.pages.create({
        parent: {
          database_id: notionDatabaseId,
        } as any,
        properties: {
          title: {
            title: [{ type: "text", text: { content: title.slice(0, 120) } }],
          },
        } as any,
        children: splitIntoParagraphChildren(transcript),
      } as any);
    }

    return NextResponse.json({
      success: true,
      title,
      notionPageId: createdPage?.id ?? null,
      transcript,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to upload and transcribe.",
      },
      { status: 500 },
    );
  }
}
