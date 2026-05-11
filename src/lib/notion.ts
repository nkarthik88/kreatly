import { Client } from "@notionhq/client";

const notionSecret = process.env.NOTION_SECRET;

if (!notionSecret) {
  throw new Error("Missing NOTION_SECRET environment variable.");
}

export const notion = new Client({
  auth: notionSecret,
});

