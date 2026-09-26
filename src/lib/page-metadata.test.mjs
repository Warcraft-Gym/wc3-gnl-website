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
