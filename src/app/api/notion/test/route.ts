import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawToken = process.env.NOTION_SECRET || '';
    const token = rawToken.replace(/[^a-zA-Z0-9_]/g, '');
    const notion = new Client({ auth: token });
    
    const data = await notion.search({});
    const me = await notion.users.me({});
    const anyMe = me as any;
    const workspaceName =
      anyMe?.bot?.owner?.workspace_name || "Kreatly Workspace";

    const pages =
      Array.isArray(data.results) &&
      data.results
        .filter((item: any) => item.object === "page")
        .map((page: any) => {
          const props = page.properties || {};
          const titleProp = (props.title || props.Name) as any;
          const title =
            titleProp?.title?.[0]?.plain_text || page.url || "Untitled page";
          return { id: page.id, title };
        });

    return NextResponse.json({
      success: true,
      workspace: workspaceName,
      bot: anyMe?.name,
      count: Array.isArray(pages) ? pages.length : 0,
      pages: Array.isArray(pages) ? pages : [],
      message: `Connected to ${workspaceName} as ${
        anyMe?.name
      }. Found ${Array.isArray(pages) ? pages.length : 0} pages.`,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    });
  }
}

