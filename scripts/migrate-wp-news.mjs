/**
 * WordPress → Sanity migration for News (blog) posts.
 *
 * Fetches posts in the news categories (news / gnl / general / replays),
 * skips anything already migrated as a Learn guide, converts each article's
 * HTML to Portable Text (images + videos preserved), and writes an NDJSON of
 * `post` documents.
 *
 * Usage:
 *   node scripts/migrate-wp-news.mjs            # build scripts/wp-news.ndjson
 *   node scripts/migrate-wp-news.mjs --limit 2  # smoke test
 *
 * Then import (needs a Sanity Editor token):
 *   SANITY_AUTH_TOKEN=<token> npx sanity dataset import scripts/wp-news.ndjson production --replace
 */
import { writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { htmlToBlocks } from "@portabletext/block-tools";
import { Schema } from "@sanity/schema";

const WP = "https://warcraft-gym.com/wp-json/wp/v2";
const OUT = "scripts/wp-news.ndjson";

const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

// WordPress news categories → our post category.
const NEWS_CATS = { 28: "news", 58: "recap", 53: "news", 86: "recap" };
const NEWS_CAT_IDS = Object.keys(NEWS_CATS).map(Number);
// Learn categories — a post in any of these was already migrated as a guide.
const LEARN_CAT_IDS = [37, 36, 35, 38, 46, 45, 64, 34];

function postCategory(wpCategoryIds) {
  for (const id of wpCategoryIds) if (NEWS_CATS[id]) return NEWS_CATS[id];
  return "news";
}

// Compile a schema so block-tools knows the body content type.
const compiled = Schema.compile({
  name: "default",
  types: [
    {
      name: "post",
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
const blockContentType = compiled
  .get("post")
  .fields.find((f) => f.name === "body").type;

const decodeEntities = (s = "") =>
  new JSDOM(`<!doctype html><body>${s}`).window.document.body.textContent.trim();

function normalizeVideoUrl(raw = "") {
  if (/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/.test(raw)) return raw;
  if (/vimeo\.com\/(?:video\/)?\d+/.test(raw)) return raw;
  return null;
}

const linkRule = {
  deserialize(el, next) {
    if (el.tagName?.toLowerCase() !== "a") return undefined;
    const href = el.getAttribute("href");
    if (!href) return undefined;
    return { _type: "__annotation", markDef: { _type: "link", href }, children: next(el.childNodes) };
  },
};
const imageRule = {
  deserialize(el, _next, block) {
    if (el.tagName?.toLowerCase() !== "img") return undefined;
    const src = el.getAttribute("src");
    if (!src) return undefined;
    return block({ _type: "image", _sanityAsset: `image@${src}` });
  },
};
const youtubeRule = {
  deserialize(el, _next, block) {
    if (el.tagName?.toLowerCase() !== "iframe") return undefined;
    const url = normalizeVideoUrl(el.getAttribute("src") || "");
    if (!url) return undefined;
    return block({ _type: "youtube", url });
  },
};

function cleanBodyHtml(html) {
  const doc = new JSDOM(html).window.document;
  doc
    .querySelectorAll('script, style, .sharedaddy, .jp-relatedposts, .wp-block-buttons, [class*="pt-cv"]')
    .forEach((el) => el.remove());
  for (let el = doc.body.lastElementChild; el; ) {
    const prev = el.previousElementSibling;
    const tag = el.tagName.toLowerCase();
    if (tag === "hr" || ((tag === "p" || tag === "div") && !el.textContent.trim())) {
      el.remove();
      el = prev;
    } else break;
  }
  doc
    .querySelectorAll("figure.wp-block-embed, .wp-block-embed, .wp-block-embed__wrapper")
    .forEach((fig) => {
      const link = fig.querySelector("a")?.getAttribute("href") || "";
      const url = normalizeVideoUrl(link) || normalizeVideoUrl((fig.textContent || "").trim());
      if (url) {
        const ifr = doc.createElement("iframe");
        ifr.setAttribute("src", url);
        fig.replaceWith(ifr);
      }
    });
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

async function fetchNewsPosts() {
  const posts = [];
  for (let page = 1; ; page++) {
    const url = `${WP}/posts?categories=${NEWS_CAT_IDS.join(",")}&per_page=100&page=${page}&_embed=author,wp:featuredmedia`;
    const res = await fetch(url);
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`WP fetch failed: ${res.status}`);
    const batch = await res.json();
    if (!batch.length) break;
    posts.push(...batch);
    const total = Number(res.headers.get("x-wp-totalpages") || page);
    if (page >= total) break;
  }
  return posts;
}

async function main() {
  console.log("Fetching news posts from WordPress…");
  const raw = await fetchNewsPosts();
  console.log(`  ${raw.length} posts in news categories`);

  const perCat = {};
  const lines = [];
  let skipped = 0;

  for (const post of raw.slice(0, LIMIT)) {
    // Skip anything already migrated as a Learn guide.
    if ((post.categories || []).some((c) => LEARN_CAT_IDS.includes(c))) {
      skipped++;
      continue;
    }
    const category = postCategory(post.categories || []);
    const title = decodeEntities(post.title?.rendered || "Untitled");
    const bodyHtml = cleanBodyHtml(post.content?.rendered || "");
    const blocks = htmlToBlocks(bodyHtml, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      rules: [linkRule, imageRule, youtubeRule],
    });
    const excerpt =
      decodeEntities((post.excerpt?.rendered || "").replace(/<[^>]+>/g, "")).slice(0, 260) ||
      title;
    const author = post._embedded?.author?.[0]?.name || "Gym Staff";
    const cover = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;

    lines.push(
      JSON.stringify({
        _id: `post-${post.id}`,
        _type: "post",
        legacyId: String(post.id),
        title,
        slug: { _type: "slug", current: post.slug },
        category,
        author,
        publishedAt: post.date ? new Date(post.date).toISOString() : undefined,
        readingMinutes: readingMinutes(blocks),
        ...(cover ? { coverImage: { _type: "image", _sanityAsset: `image@${cover}` } } : {}),
        excerpt,
        body: blocks,
      }),
    );
    perCat[category] = (perCat[category] || 0) + 1;
  }

  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`\nWrote ${lines.length} post documents → ${OUT}`);
  console.log("By category:", perCat);
  if (skipped) console.log(`Skipped ${skipped} (already migrated as guides)`);
  console.log(
    "\nNext: SANITY_AUTH_TOKEN=<token> npx sanity dataset import " + OUT + " production --replace",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
