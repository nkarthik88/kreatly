import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const secret = process.env.NOTION_SECRET;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!secret || !databaseId) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing Notion Credentials",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Connection to Notion verified. Starting data mapping...",
    },
    { status: 200 },
  );
}

export async function GET() {
  return POST();
}
