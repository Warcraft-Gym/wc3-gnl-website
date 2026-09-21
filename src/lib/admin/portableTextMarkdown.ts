/**
 * A tiny markdown-lite dialect for editing Sanity Portable Text bodies
 * (post/guide) without pulling in a full rich-text editor. It only covers
 * the subset the schemas + PortableBody renderer already support:
 *
 *   ## Heading            -> style "h2"
 *   ### Heading           -> style "h3"
 *   > quote                -> style "blockquote"
 *   - bullet line          -> normal block with listItem "bullet"
 *   1. numbered line       -> normal block with listItem "number"
 *   (2 leading spaces per level, up to 4) -> nested list level
 *   **bold**               -> strong mark
 *   *italic* / _italic_    -> em mark
 *   `code`                 -> code mark
 *   ~~strike~~             -> strike-through mark
 *   [text](https://…)      -> link mark
 *   {{image:<assetId>|alt text}}   -> image block
 *   {{youtube:<url>}}              -> youtube block
 *   blank line              -> paragraph break
 *
 * parseBodyMarkdown() and serializeBodyMarkdown() are inverses of each other
 * for that subset, so an existing document's body can be loaded into the
 * textarea, edited, and saved back without losing its shape.
 */

type Span = { _type: "span"; _key: string; text: string; marks: string[] };
type MarkDef = { _type: "link"; _key: string; href: string };
type Block = {
  _type: "block";
  _key: string;
  style: "normal" | "h2" | "h3" | "blockquote";
  listItem?: "bullet" | "number";
  level?: number;
  markDefs: MarkDef[];
  children: Span[];
};
type ImageBlock = { _type: "image"; _key: string; asset: { _type: "reference"; _ref: string }; alt?: string };
type YoutubeBlock = { _type: "youtube"; _key: string; url: string };
export type PortableBlock = Block | ImageBlock | YoutubeBlock;

const key = () => globalThis.crypto.randomUUID().slice(0, 12);
const span = (text: string, marks: string[] = []): Span => ({ _type: "span", _key: key(), text, marks });

// Order matters: more specific delimiters (** ~~ `` ``) must be tried before the
// single-character ones (* _) they'd otherwise be mistaken for.
const INLINE_RE =
  /(\*\*(.+?)\*\*)|(~~(.+?)~~)|(`([^`]+?)`)|(\*(.+?)\*)|(_(.+?)_)|(\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;

function parseInline(text: string): { children: Span[]; markDefs: MarkDef[] } {
  const markDefs: MarkDef[] = [];
  const children: Span[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) children.push(span(text.slice(lastIndex, match.index)));
    if (match[1]) {
      children.push(span(match[2], ["strong"]));
    } else if (match[3]) {
      children.push(span(match[4], ["strike-through"]));
    } else if (match[5]) {
      children.push(span(match[6], ["code"]));
    } else if (match[7]) {
      children.push(span(match[8], ["em"]));
    } else if (match[9]) {
      children.push(span(match[10], ["em"]));
    } else if (match[11]) {
      const markKey = key();
      markDefs.push({ _type: "link", _key: markKey, href: match[13] });
      children.push(span(match[12], [markKey]));
    }
    lastIndex = INLINE_RE.lastIndex;
  }
  if (lastIndex < text.length) children.push(span(text.slice(lastIndex)));
  if (!children.length) children.push(span(""));
  return { children, markDefs };
}

const MAX_LIST_LEVEL = 4;

function makeBlock(text: string, style: Block["style"], listItem?: "bullet" | "number", level = 1): Block {
  const { children, markDefs } = parseInline(text);
  return { _type: "block", _key: key(), style, listItem, level: listItem ? level : undefined, markDefs, children };
}

const IMAGE_RE = /^\{\{image:([^|}]+)(?:\|([^}]*))?\}\}$/;
const YOUTUBE_RE = /^\{\{youtube:(\S+)\}\}$/;
const H2_RE = /^##\s+(.*)$/;
const H3_RE = /^###\s+(.*)$/;
const BLOCKQUOTE_RE = /^>\s?(.*)$/;
const LIST_RE = /^([-*]|\d+\.)\s+(.*)$/;

export function parseBodyMarkdown(markdown: string): PortableBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: PortableBlock[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join(" ").trim();
    buffer = [];
    if (text) blocks.push(makeBlock(text, "normal"));
  };

  for (const raw of lines) {
    // Leading spaces are significant for list nesting, so trim indentation
    // separately instead of trimming the whole line up front.
    const indent = raw.match(/^[ \t]*/)?.[0] ?? "";
    const line = raw.slice(indent.length).trimEnd();
    if (line === "") {
      flush();
      continue;
    }

    const img = line.match(IMAGE_RE);
    if (img) {
      flush();
      blocks.push({ _type: "image", _key: key(), asset: { _type: "reference", _ref: img[1] }, alt: img[2] || undefined });
      continue;
    }

    const yt = line.match(YOUTUBE_RE);
    if (yt) {
      flush();
      blocks.push({ _type: "youtube", _key: key(), url: yt[1] });
      continue;
    }

    const h2 = line.match(H2_RE);
    if (h2) {
      flush();
      blocks.push(makeBlock(h2[1], "h2"));
      continue;
    }

    const h3 = line.match(H3_RE);
    if (h3) {
      flush();
      blocks.push(makeBlock(h3[1], "h3"));
      continue;
    }

    const quote = line.match(BLOCKQUOTE_RE);
    if (quote) {
      flush();
      blocks.push(makeBlock(quote[1], "blockquote"));
      continue;
    }

    const list = line.match(LIST_RE);
    if (list) {
      flush();
      const listItem = /^\d+\.$/.test(list[1]) ? "number" : "bullet";
      const level = Math.min(MAX_LIST_LEVEL, Math.floor(indent.length / 2) + 1);
      blocks.push(makeBlock(list[2], "normal", listItem, level));
      continue;
    }

    buffer.push(line);
  }
  flush();
  return blocks;
}

function textOfBlock(block: Block): string {
  return block.children
    .map((child) => {
      let text = child.text ?? "";
      const linkDef = child.marks?.map((m) => block.markDefs.find((d) => d._key === m)).find(Boolean);
      if (child.marks?.includes("code")) text = `\`${text}\``;
      if (child.marks?.includes("strike-through")) text = `~~${text}~~`;
      if (child.marks?.includes("em")) text = `*${text}*`;
      if (child.marks?.includes("strong")) text = `**${text}**`;
      if (linkDef) text = `[${text}](${linkDef.href})`;
      return text;
    })
    .join("");
}

export function serializeBodyMarkdown(blocks: PortableBlock[] = []): string {
  const lines: string[] = [];
  // Tracks the running count per nesting level for consecutive numbered
  // list items; cleared whenever the numbered list is interrupted.
  const numberCounters = new Map<number, number>();

  for (const block of blocks) {
    if (block._type === "image") {
      numberCounters.clear();
      lines.push(`{{image:${block.asset?._ref ?? ""}${block.alt ? `|${block.alt}` : ""}}}`, "");
      continue;
    }
    if (block._type === "youtube") {
      numberCounters.clear();
      lines.push(`{{youtube:${block.url ?? ""}}}`, "");
      continue;
    }
    const text = textOfBlock(block);
    const level = Math.min(MAX_LIST_LEVEL, Math.max(1, block.level ?? 1));
    const indent = "  ".repeat(level - 1);
    if (block.style === "h2") {
      numberCounters.clear();
      lines.push(`## ${text}`, "");
    } else if (block.style === "h3") {
      numberCounters.clear();
      lines.push(`### ${text}`, "");
    } else if (block.style === "blockquote") {
      numberCounters.clear();
      lines.push(`> ${text}`, "");
    } else if (block.listItem === "number") {
      const count = (numberCounters.get(level) ?? 0) + 1;
      numberCounters.set(level, count);
      for (const deeperLevel of [...numberCounters.keys()]) {
        if (deeperLevel > level) numberCounters.delete(deeperLevel);
      }
      lines.push(`${indent}${count}. ${text}`);
    } else if (block.listItem === "bullet") {
      numberCounters.clear();
      lines.push(`${indent}- ${text}`);
    } else {
      numberCounters.clear();
      lines.push(text, "");
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
