/**
 * Every Sanity query must carry a tag for each document type it reads,
 * dereferences included.
 *
 * Missing one does not fail loudly. The page simply keeps serving the old
 * content after an edit, which is the exact bug this tagging was introduced
 * to fix: a creep route page shows its map's name and its companion build's
 * title, so a `creepMap` edit has to purge creep routes as well as maps.
 *
 * This reads the sources and compares what a query dereferences against what
 * it is tagged with, so a new `foo->` in a projection fails here rather than
 * six weeks later when someone notices a stale name.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

/** Reference fields that point at another document type, and which type. */
const REFERENCE_FIELDS = {
  "map->": "creepMap",
  "build->": "buildOrder",
  "guide->": "guide",
  // Same type as the document holding it, so it needs no extra tag.
  "supersedes->": null,
  // An image asset, not a document anyone edits in the Studio.
  "asset->": null,
  "author->": null,
};

const FILES = [
  "src/lib/builds/builds.ts",
  "src/lib/creep-routes/routes.ts",
  "src/lib/creep-routes/maps.ts",
  "src/lib/learn/guides.ts",
  "src/lib/content/index.ts",
  "src/lib/tools-data.ts",
  "src/lib/gnl/rules.ts",
  "src/lib/koth/page.ts",
];

test("every Sanity read is tagged, none left untagged", () => {
  for (const f of FILES) {
    const src = read(f);
    assert.ok(src.includes("sanityCache("), `${f} has no tagged fetch`);
    assert.ok(
      !/next: \{ revalidate: \d+ \}/.test(src),
      `${f} still has an untagged fetch, which no webhook can purge`,
    );
  }
});

test("a query is tagged with every type it dereferences", () => {
  const missing = [];
  for (const f of FILES) {
    const src = read(f);
    const tagged = new Set([...src.matchAll(/sanityCache\(([^)]*)\)/g)].flatMap((m) =>
      [...m[1].matchAll(/"([a-zA-Z]+)"/g)].map((x) => x[1]),
    ));
    for (const [field, type] of Object.entries(REFERENCE_FIELDS)) {
      if (!type || !src.includes(field)) continue;
      if (!tagged.has(type)) missing.push(`${f} dereferences ${field} but is not tagged "${type}"`);
    }
  }
  assert.deepEqual(missing, []);
});

test("the webhook purges the edited type, not everything", () => {
  const route = read("src/app/api/revalidate/route.ts");
  assert.match(route, /revalidateTag\(sanityTag\(type as SanityType\), "max"\)/);
  assert.ok(
    !/revalidateTag\(\s*SANITY_TAG/.test(route),
    "a single global tag rewrites every cached page on any edit",
  );
});

test("the backstop is long, because the webhook is the mechanism", () => {
  const cache = read("src/lib/content/cache.ts");
  const m = cache.match(/SANITY_REVALIDATE = (\d+)/);
  assert.ok(m, "SANITY_REVALIDATE must be defined");
  assert.ok(Number(m[1]) >= 1800, `backstop is ${m[1]}s; short windows rewrite caches for nothing`);
});

test("every registered document type can be purged", () => {
  // A type the webhook has no path for is skipped entirely, so a new
  // document type needs a PATHS entry or its edits never appear.
  const types = read("src/sanity/schemaTypes/index.ts").match(/schemaTypes = \[([^\]]*)\]/)[1]
    .split(",").map((s) => s.trim()).filter(Boolean);
  const route = read("src/app/api/revalidate/route.ts");
  const missing = types.filter((t) => !new RegExp(`\\b${t}:`).test(route));
  assert.deepEqual(missing, [], "these types are registered but the webhook ignores them");
});
