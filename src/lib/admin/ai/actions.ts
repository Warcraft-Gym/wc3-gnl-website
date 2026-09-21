import "server-only";
import { z } from "zod";
import { complete, type AiProvider, type ChatMessage } from "./provider";

/** Strips a ```json fenced code block, if present, so JSON.parse works on the raw model reply. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim());
}

/** Rough plain-text extract of the markdown-lite body, for SEO prompt context only. */
function plainTextOf(markdown: string): string {
  return markdown
    .replace(/\{\{image:[^}]*\}\}/g, "")
    .replace(/\{\{youtube:[^}]*\}\}/g, "")
    .replace(/^#{2,3}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*([-*]|\d+\.)\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+?)`/g, "$1")
    .replace(/(?<!\*)\*(.+?)\*(?!\*)/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\n{2,}/g, " ")
    .trim();
}

const draftResultSchema = z.object({
  title: z.string().trim().min(1).max(120),
  excerpt: z.string().trim().min(1).max(280),
  body: z.string().trim().min(1),
});
export type DraftResult = z.infer<typeof draftResultSchema>;

const seoResultSchema = z.object({
  title: z.string().trim().min(1).max(120),
  excerpt: z.string().trim().min(1).max(280),
});
export type SeoResult = z.infer<typeof seoResultSchema>;

const BODY_SYNTAX_NOTE =
  "The body uses a lightweight markdown dialect: '## ' and '### ' for headings, '> ' for blockquotes, " +
  "'- ' for bullet list items and '1. ' for numbered list items (indent an item with 2 extra spaces per " +
  "nesting level, up to 4 levels, to put it inside the item above), '**bold**', '*italic*', '`code`', " +
  "'~~strikethrough~~', and '[text](https://...)' for links. Do not use any other markdown syntax, " +
  "and do not invent {{image:...}} or {{youtube:...}} tokens.";

const FULL_BODY_NOTE =
  "Whenever you return a 'body', it REPLACES the entire current body, so it must contain the complete article " +
  "from start to finish \u2014 every section that isn't part of the requested change must be copied over verbatim. " +
  "Never truncate, summarize, or reply with '...' / '(rest unchanged)' in place of existing content.";

export async function draftArticle(
  provider: AiProvider,
  model: string,
  articleType: "post" | "guide",
  topic: string,
): Promise<DraftResult> {
  const system =
    `You help a Warcraft III esports league write ${articleType === "post" ? "news posts" : "strategy guides"} ` +
    "for non-technical admins. Reply with ONLY a JSON object: {\"title\": string, \"excerpt\": string (<=280 chars, " +
    "a compelling summary for search results and previews), \"body\": string}. " +
    BODY_SYNTAX_NOTE;
  const raw = await complete(provider, model, system, [{ role: "user", content: `Write a draft about: ${topic}` }]);
  return draftResultSchema.parse(extractJson(raw));
}

export async function improveBody(
  provider: AiProvider,
  model: string,
  body: string,
  instruction: string,
): Promise<string> {
  const system =
    "You edit the body text of a Warcraft III esports article. Reply with ONLY the revised body text, " +
    "no preamble, no code fences, no explanation. " +
    BODY_SYNTAX_NOTE +
    " " +
    FULL_BODY_NOTE;
  const raw = await complete(provider, model, system, [{ role: "user", content: `Instruction: ${instruction}\n\nCurrent body:\n${body}` }]);
  return raw.trim();
}

export async function suggestSeo(
  provider: AiProvider,
  model: string,
  title: string,
  body: string,
): Promise<SeoResult> {
  const system =
    "You write SEO-friendly titles and excerpts for a Warcraft III esports league site, for non-technical admins " +
    "who don't know SEO best practices. Reply with ONLY a JSON object: {\"title\": string, \"excerpt\": string} " +
    "where excerpt is ideally 130-155 characters and never over 280.";
  const raw = await complete(provider, model, system, [{ role: "user", content: `Title: ${title}\n\nBody:\n${plainTextOf(body)}` }]);
  return seoResultSchema.parse(extractJson(raw));
}

const chatResultSchema = z.object({
  reply: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120).optional(),
  excerpt: z.string().trim().min(1).max(280).optional(),
  body: z.string().trim().min(1).optional(),
});
export type ChatResult = z.infer<typeof chatResultSchema>;

export async function chatAboutArticle(
  provider: AiProvider,
  model: string,
  articleType: "post" | "guide",
  article: { title: string; excerpt: string; body: string },
  history: ChatMessage[],
): Promise<ChatResult> {
  const system =
    `You are a conversational editing assistant helping an admin write a Warcraft III esports league ` +
    `${articleType === "post" ? "news post" : "strategy guide"}. ` +
    "Reply with ONLY a JSON object: {\"reply\": string, \"title\"?: string, \"excerpt\"?: string, \"body\"?: string}. " +
    "'reply' is your conversational message shown to the admin in a chat window — it must be a SHORT summary of what " +
    "you changed and why (e.g. \"Shortened the intro and added a section on...\"). Never restate or repeat the full " +
    "updated title/excerpt/body text inside 'reply' — that content is applied directly to the article for the admin " +
    "to see there, not shown in the chat. Only include 'title', 'excerpt', or 'body' when you are " +
    "actually proposing a change to that field — omit fields you aren't changing. " +
    BODY_SYNTAX_NOTE +
    " " +
    FULL_BODY_NOTE +
    `\n\nCurrent title: ${article.title}\nCurrent excerpt: ${article.excerpt}\nCurrent body:\n${article.body}`;
  const raw = await complete(provider, model, system, history);
  return chatResultSchema.parse(extractJson(raw));
}
