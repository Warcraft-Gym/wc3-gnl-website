/**
 * Every artwork folder in `public/` gets a browser cache header.
 *
 * Without one, Vercel serves it `max-age=0, must-revalidate` and every icon
 * on every page view is a billed CDN request, 304 or not. CDN requests were
 * the largest line on the usage bill. A new folder dropped into `public/`
 * would quietly fall back to that default, so this lists the folders on disk
 * and fails on any that `next.config.ts` does not name.
 *
 * Reads the config as text, like the other design guards: a copy of the
 * list here would keep passing after the real one changed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG = readFileSync(join(ROOT, "next.config.ts"), "utf8");

/** The string entries of a `const NAME = [ ... ];` array in the config. */
function listed(name) {
  const m = CONFIG.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  assert.ok(m, `${name} is not defined in next.config.ts`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

test("every public/ folder is covered by a cache rule", () => {
  const covered = new Set([...listed("STATIC_ART"), ...listed("SEASONAL_ART")]);
  const folders = readdirSync(join(ROOT, "public"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const missing = folders.filter((f) => !covered.has(f));
  assert.deepEqual(missing, [], `public/ folders with no cache header (billed per view): ${missing.join(", ")}`);
});

test("no folder is listed twice with conflicting windows", () => {
  const both = listed("STATIC_ART").filter((f) => listed("SEASONAL_ART").includes(f));
  assert.deepEqual(both, []);
});

test("the headers actually cache, and nothing is marked immutable", () => {
  // Filenames here are not content-hashed, so `immutable` would pin a
  // corrected icon in browsers for good.
  for (const name of ["ART_CACHE", "SEASONAL_ART_CACHE"]) {
    const m = CONFIG.match(new RegExp(`const ${name} = "([^"]+)"`));
    assert.ok(m, `${name} is not defined`);
    const age = Number(m[1].match(/max-age=(\d+)/)?.[1]);
    assert.ok(age >= 3600, `${name} caches for ${age}s; the point is to cache`);
    assert.doesNotMatch(m[1], /immutable/, `${name} must not be immutable`);
  }
  assert.match(CONFIG, /async headers\(\)/, "next.config.ts no longer defines headers()");
});
