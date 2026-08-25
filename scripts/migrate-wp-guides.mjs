/**
 * WordPress → Sanity migration for Learn guides.
 *
 * Fetches posts in the "learn" categories from the warcraft-gym.com WordPress
 * REST API, converts each article's HTML body to Portable Text, and writes an
 * NDJSON file of `guide` documents. Inline images and the featured image are
 * emitted as `_sanityAsset: image@<url>` directives, which `sanity dataset
 * import` fetches and uploads automatically.
 *
 * Usage:
 *   node scripts/migrate-wp-guides.mjs            # build scripts/wp-guides.ndjson
 *   node scripts/migrate-wp-guides.mjs --limit 2  # smoke test a couple of posts
 *
 * Then import (needs a Sanity Editor token):
 *   SANITY_AUTH_TOKEN=<token> npx sanity dataset import scripts/wp-guides.ndjson production --replace
 *
 * This is a one-way migration of the site's own content. Re-running is
 * idempotent: each guide gets a deterministic _id (guide-<wpId>).
 */
import { writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { htmlToBlocks } from "@portabletext/block-tools";
import { Schema } from "@sanity/schema";

const WP = "https://warcraft-gym.com/wp-json/wp/v2";
const OUT = "scripts/wp-guides.ndjson";

const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

// WordPress category id → our learn category id. Order = assignment priority
// (most specific first). A post's category is the first match in this list.
const CATEGORY_PRIORITY = [
  [37, "human"],
  [36, "night-elf"],
  [35, "orc"],
  [38, "undead"],
  [46, "creep-routes"],
  [45, "mechanics"], // tips-mechanics
  [64, "new-players"], // beginner
  [34, "mechanics"], // tutorials (fallback bucket)
];
const LEARN_CAT_IDS = [...new Set(CATEGORY_PRIORITY.map(([id]) => id))];

// Compile a minimal schema so block-tools knows the body content type.
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
          // Self-contained image object so a standalone Schema.compile doesn't
          // need Sanity's core imageHotspot types. `_sanityAsset` passes through
          // and is resolved to a real asset by `sanity dataset import`.
          of: [
            { type: "block" },
            {
              type: "object",
              name: "image",
              fields: [{ name: "_sanityAsset", type: "string" }],
            },
          ],
        },
      ],
    },
  ],
});
const blockContentType = compiled
  .get("guide")
  .fields.find((f) => f.name === "body").type;

const decodeEntities = (s = "") =>
  new JSDOM(`<!doctype html><body>${s}`).window.document.body.textContent.trim();

function assignCategory(wpCategoryIds) {
  for (const [id, learn] of CATEGORY_PRIORITY) {
    if (wpCategoryIds.includes(id)) return learn;
  }
  return null;
}

function guessLevel(title) {
  const t = title.toLowerCase();
  if (/(beginner|intro|basics|getting started|new player)/.test(t)) return "beginner";
  if (/(advanced|high level|pro )/.test(t)) return "advanced";
  return "intermediate";
}

const imageRule = {
  deserialize(el, _next, block) {
    if (el.tagName?.toLowerCase() !== "img") return undefined;
    const src = el.getAttribute("src");
    if (!src) return undefined;
    return block({ _type: "image", _sanityAsset: `image@${src}` });
  },
};

const linkRule = {
  deserialize(el, next) {
    if (el.tagName?.toLowerCase() !== "a") return undefined;
    const href = el.getAttribute("href");
    if (!href) return undefined;
    return {
      _type: "__annotation",
      markDef: { _type: "link", href },
      children: next(el.childNodes),
    };
  },
};

function cleanBodyHtml(html) {
  const doc = new JSDOM(html).window.document;
  doc
    .querySelectorAll("script, style, iframe, .sharedaddy, .jp-relatedposts, .wp-block-buttons")
    .forEach((el) => el.remove());
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

async function fetchAllLearnPosts() {
  const posts = [];
  for (let page = 1; ; page++) {
    const url = `${WP}/posts?categories=${LEARN_CAT_IDS.join(",")}&per_page=100&page=${page}&_embed=wp:featuredmedia`;
    const res = await fetch(url);
    if (res.status === 400) break; // past last page
    if (!res.ok) throw new Error(`WP fetch failed: ${res.status}`);
    const batch = await res.json();
    if (!batch.length) break;
    posts.push(...batch);
    const totalPages = Number(res.headers.get("x-wp-totalpages") || page);
    if (page >= totalPages) break;
  }
  return posts;
}

function featuredImageUrl(post) {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  return media?.source_url || null;
}

async function main() {
  console.log("Fetching learn posts from WordPress…");
  const raw = await fetchAllLearnPosts();
  console.log(`  ${raw.length} posts in learn categories`);

  const perCat = {};
  const lines = [];
  let skipped = 0;

  for (const post of raw.slice(0, LIMIT)) {
    const category = assignCategory(post.categories || []);
    if (!category) {
      skipped++;
      continue;
    }
    const title = decodeEntities(post.title?.rendered || "Untitled");
    const bodyHtml = cleanBodyHtml(post.content?.rendered || "");
    const blocks = htmlToBlocks(bodyHtml, blockContentType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      rules: [linkRule, imageRule],
    });
    const excerpt =
      decodeEntities((post.excerpt?.rendered || "").replace(/<[^>]+>/g, "")).slice(0, 260) ||
      title;
    const cover = featuredImageUrl(post);

    const doc = {
      _id: `guide-${post.id}`,
      _type: "guide",
      legacyId: String(post.id),
      title,
      slug: { _type: "slug", current: post.slug },
      category,
      level: guessLevel(title),
      excerpt,
      readingMinutes: readingMinutes(blocks),
      publishedAt: post.date ? new Date(post.date).toISOString() : undefined,
      ...(cover ? { coverImage: { _type: "image", _sanityAsset: `image@${cover}` } } : {}),
      body: blocks,
    };
    lines.push(JSON.stringify(doc));
    perCat[category] = (perCat[category] || 0) + 1;
  }

  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`\nWrote ${lines.length} guide documents → ${OUT}`);
  console.log("By category:", perCat);
  if (skipped) console.log(`Skipped ${skipped} (no learn category matched)`);
  console.log(
    "\nNext: SANITY_AUTH_TOKEN=<token> npx sanity dataset import " +
      OUT +
      " production --replace",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
