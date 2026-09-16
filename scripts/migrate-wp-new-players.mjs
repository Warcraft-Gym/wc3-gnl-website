/**
 * WordPress → Sanity for the single "New / Returning Players Guide" page.
 *
 * Fetches the page, converts its HTML to Portable Text with the same rules as
 * migrate-wp-guides.mjs (links, images, YouTube embeds), and writes an NDJSON
 * `guide` document in the new-players category that /learn/new-players
 * features at the top.
 *
 * Usage:
 *   node scripts/migrate-wp-new-players.mjs
 *   SANITY_AUTH_TOKEN=<token> npx sanity dataset import scripts/wp-new-players.ndjson production --replace
 */
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { JSDOM } from "jsdom";
import { htmlToBlocks } from "@portabletext/block-tools";
import { Schema } from "@sanity/schema";

const WP = "https://warcraft-gym.com/wp-json/wp/v2";
const OUT = "scripts/wp-new-players.ndjson";
const SLUG = "new-returning-players-guide-to-warcraft-iii";
const DOC_ID = "guide-new-returning-players";

const compiled = Schema.compile({
  name: "default",
  types: [
    {
      name: "guide",
      type: "document",
      fields: [
        {
          name: "body",
          type: "array",
          of: [
            { type: "block" },
            { type: "object", name: "image", fields: [{ name: "_sanityAsset", type: "string" }] },
            { type: "object", name: "youtube", fields: [{ name: "url", type: "string" }] },
          ],
        },
      ],
    },
  ],
});
const blockContentType = compiled.get("guide").fields.find((f) => f.name === "body").type;

const decode = (s = "") => new JSDOM(`<!doctype html><body>${s}`).window.document.body.textContent.trim();

function normalizeVideoUrl(raw = "") {
  if (/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/.test(raw)) return raw;
  if (/vimeo\.com\/(?:video\/)?\d+/.test(raw)) return raw;
  return null;
}

const rules = [
  {
    deserialize(el, _next, block) {
      if (el.tagName?.toLowerCase() !== "img") return undefined;
      const src = el.getAttribute("src");
      return src ? block({ _type: "image", _sanityAsset: `image@${src}` }) : undefined;
    },
  },
  {
    deserialize(el, next) {
      if (el.tagName?.toLowerCase() !== "a") return undefined;
      const href = el.getAttribute("href");
      if (!href) return undefined;
      const markDef = { _key: randomBytes(6).toString("hex"), _type: "link", href };
      return { _type: "__annotation", markDef, children: next(el.childNodes) };
    },
  },
  {
    deserialize(el, _next, block) {
      if (el.tagName?.toLowerCase() !== "iframe") return undefined;
      const url = normalizeVideoUrl(el.getAttribute("src") || "");
      return url ? block({ _type: "youtube", url }) : undefined;
    },
  },
];

function cleanBodyHtml(html) {
  const doc = new JSDOM(html).window.document;
  doc
    .querySelectorAll('script, style, .sharedaddy, .jp-relatedposts, .wp-block-buttons, [class*="pt-cv"]')
    .forEach((el) => el.remove());
  // The "Guide overview" table of contents links to WP anchors that do not
  // exist here; the page gets its own section structure instead.
  doc.querySelector("#guide-overview")?.closest(".wp-block-columns")?.remove();
  // Each section is a "cover" block: a numbered bold paragraph, an h2 tagline
  // and a summary list. Turn that into a real heading hierarchy.
  doc.querySelectorAll(".wp-block-cover").forEach((cover) => {
    const numbered = cover.querySelector("p");
    const tagline = cover.querySelector("h2");
    if (numbered) {
      const h2 = doc.createElement("h2");
      h2.textContent = numbered.textContent.replace(/^\d+\.\s*/, "").trim();
      numbered.replaceWith(h2);
    }
    if (tagline) {
      const h3 = doc.createElement("h3");
      h3.textContent = tagline.textContent.trim();
      tagline.replaceWith(h3);
    }
  });
  doc.querySelectorAll('a[href*="warcraft-gym.com/new-returning-players-guide-to-warcraft-iii#"]').forEach((a) => a.replaceWith(...a.childNodes));
  doc.querySelectorAll("figure.wp-block-embed, .wp-block-embed, .wp-block-embed__wrapper").forEach((fig) => {
    const link = fig.querySelector("a")?.getAttribute("href") || "";
    const url = normalizeVideoUrl(link) || normalizeVideoUrl((fig.textContent || "").trim());
    if (url) {
      const ifr = doc.createElement("iframe");
      ifr.setAttribute("src", url);
      fig.replaceWith(ifr);
    }
  });
  for (let el = doc.body.lastElementChild; el; ) {
    const prev = el.previousElementSibling;
    const tag = el.tagName.toLowerCase();
    if (tag === "hr" || ((tag === "p" || tag === "div") && !el.textContent.trim())) {
      el.remove();
      el = prev;
    } else break;
  }
  return doc.body.innerHTML;
}

function readingMinutes(blocks) {
  const words = blocks
    .filter((b) => b._type === "block")
    .flatMap((b) => (b.children || []).map((c) => c.text || ""))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const res = await fetch(`${WP}/pages?slug=${SLUG}&_embed=wp:featuredmedia`);
if (!res.ok) throw new Error(`WP fetch failed: ${res.status}`);
const [page] = await res.json();
if (!page) throw new Error("page not found");

const html = cleanBodyHtml(page.content.rendered);
const rawBody = htmlToBlocks(html, blockContentType, {
  parseHtml: (h) => new JSDOM(h).window.document,
  rules,
});
const isEmptyBlock = (b) =>
  b._type === "block" && !(b.children || []).some((c) => (c.text || "").trim());
const textOf = (b) => (b.children || []).map((c) => c.text).join("").trim();
const isHeading = (b) => b._type === "block" && /^h[1-6]$/.test(b.style || "");
// WP marks the fourth race heading up as a bold paragraph; match its siblings.
// The streamer roster is a WP column grid of one-name paragraphs; make each
// group a bullet list under its label so it reads as a list, not a tall column.
const body = rawBody
  .filter((b) => !isEmptyBlock(b))
  .map((b, i, all) => {
    const text = textOf(b);
    const prevHeading = all.slice(0, i).reverse().find(isHeading);
    const under = prevHeading ? textOf(prevHeading) : "";
    if (b.style === "normal" && text === "Human:" && under === "Undead:") {
      return { ...b, style: "h3" };
    }
    if (under === "Community Streamers" && b.style === "normal" && !b.listItem && !text.endsWith(":")) {
      return { ...b, listItem: "bullet", level: 1 };
    }
    return b;
  });
const cover = page._embedded?.["wp:featuredmedia"]?.[0]?.source_url;

const doc = {
  _id: DOC_ID,
  _type: "guide",
  title: decode(page.title.rendered),
  slug: { _type: "slug", current: SLUG },
  category: "new-players",
  level: "beginner",
  excerpt:
    "Where to start with Warcraft III today: what you need to play, how to learn the basics, the community ladder, build orders, tools, who to watch and where to compete.",
  readingMinutes: readingMinutes(body),
  publishedAt: page.date_gmt ? `${page.date_gmt}Z` : new Date().toISOString(),
  ...(cover ? { coverImage: { _type: "image", _sanityAsset: `image@${cover}` } } : {}),
  body,
  legacyId: String(page.id),
};

writeFileSync(OUT, JSON.stringify(doc) + "\n");
const counts = body.reduce((a, b) => ((a[b._type] = (a[b._type] || 0) + 1), a), {});
console.log(`wrote ${OUT}:`, doc.title, "|", doc.readingMinutes, "min |", counts);
