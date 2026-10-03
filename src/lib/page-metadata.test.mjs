/**
 * Every page declares its own title and description.
 *
 * The root layout sets `title.default` and a site description, which is right
 * for the home page and a trap for everything else: a page that forgets
 * metadata does not fail, it quietly ships the home page's title and
 * description. Two pages with the same description is the sort of thing that
 * only shows up in Search Console months later.
 *
 * This reads the route files rather than the rendered HTML so it runs offline
 * and fails at the point the page is added.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "../app");

/** Routes that legitimately have no metadata of their own. */
const EXEMPT = new Map([
  // The layout's `title.default` and `description` exist for this route and
  // no other: every other page sets a title, which goes through the template.
  // Restating them here would just be two copies to keep in step.
  ["/(site)", "the root layout's title.default and description are the home page's"],
  ["/(site)/gnl/schedule", "redirects to the current week; it never renders"],
  ["/studio/[[...tool]]", "Sanity Studio, deliberately noindex"],
]);

function pages(dir, prefix = "") {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...pages(full, `${prefix}/${entry}`));
    else if (entry === "page.tsx") found.push({ route: prefix || "/", file: full });
  }
  return found;
}

const all = pages(APP);

test("the scan finds the routes at all — a silent zero would pass everything", () => {
  assert.ok(all.length >= 25, `only found ${all.length} pages`);
});

test("every page declares a title, or is a listed exception", () => {
  const missing = [];
  for (const { route, file } of all) {
    if (EXEMPT.has(route)) continue;
    const src = readFileSync(file, "utf8");
    const has = /export const metadata\b/.test(src) || /export (async )?function generateMetadata\b/.test(src);
    if (!has) missing.push(route);
  }
  assert.deepEqual(missing, [], `these inherit the home page's metadata instead of setting their own:\n  ${missing.join("\n  ")}`);
});

test("every exemption still points at a real page", () => {
  const routes = new Set(all.map((p) => p.route));
  for (const route of EXEMPT.keys()) {
    assert.ok(routes.has(route), `${route} is exempted but no longer exists — drop the exemption`);
  }
});

test("a page declaring openGraph also gives it an image, or has its own card route", () => {
  // Declaring `openGraph` replaces the inherited object, so a page that sets
  // it without `images` and has no `opengraph-image` route of its own ships no
  // share image at all. That is how the race pages lost theirs.
  const bad = [];
  for (const { route, file } of all) {
    const src = readFileSync(file, "utf8");
    if (!/openGraph:\s*\{/.test(src)) continue;
    const hasImages = /openGraph:\s*\{[\s\S]{0,700}?images:/.test(src);
    const ownCard = readdirSync(dirname(file)).some((f) => f.startsWith("opengraph-image"));
    if (!hasImages && !ownCard) bad.push(route);
  }
  assert.deepEqual(bad, [], `these declare openGraph with no image and no card route:\n  ${bad.join("\n  ")}`);
});

test("every page builds its metadata with pageMetadata, so link previews carry its own title and url", () => {
  // Next merges `openGraph` and `twitter` per key, so a page that sets only
  // `title` and `description` keeps the home page's og:title and an og:url of
  // the site root, and Facebook, LinkedIn and WhatsApp show the home page card.
  const bare = [];
  for (const { route, file } of all) {
    if (EXEMPT.has(route)) continue;
    const src = readFileSync(file, "utf8");
    if (!/\bpageMetadata\(/.test(src) || /openGraph:\s*\{/.test(src)) bare.push(route);
  }
  assert.deepEqual(bare, [], `these set metadata without pageMetadata:\n  ${bare.join("\n  ")}`);
});

test("ownCard is passed exactly where the route has its own opengraph-image", () => {
  // ownCard leaves `images` out so the route's card supplies og:image. Without
  // it, the site card hides the route's card; with it on a route that has no
  // card, the page ships no share image at all.
  const wrong = [];
  for (const { route, file } of all) {
    if (EXEMPT.has(route)) continue;
    const src = readFileSync(file, "utf8");
    const saysOwnCard = /ownCard:\s*true/.test(src);
    const ownCard = readdirSync(dirname(file)).some((f) => f.startsWith("opengraph-image"));
    if (saysOwnCard !== ownCard) wrong.push(`${route} (ownCard: ${saysOwnCard}, card route: ${ownCard})`);
  }
  assert.deepEqual(wrong, [], wrong.join("\n  "));
});

test("there is no twitter-image file: it would win over every route's own card on X", () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.startsWith("twitter-image")) files.push(full.slice(APP.length));
    }
  };
  walk(APP);
  assert.deepEqual(files, []);
});

test("share images are JPG or PNG: Discord, Facebook, LinkedIn and WhatsApp handle webp previews poorly", () => {
  // /learn/builds shared a 1600x900 webp and Discord showed only a blurred
  // placeholder. Share cards live in public/og/ at 1200x630.
  const webp = [];
  for (const { route, file } of all) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/images:\s*\[\s*\{\s*url:\s*"([^"]+)"/g)) {
      if (!/\.(jpe?g|png)$/i.test(m[1])) webp.push(`${route}: ${m[1]}`);
    }
  }
  assert.deepEqual(webp, [], `these pages share a non-JPG/PNG preview image:\n  ${webp.join("\n  ")}`);
});
