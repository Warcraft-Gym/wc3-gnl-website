/**
 * The Sanity `creepMap` document stores its display name in `title` (that is
 * the field `src/sanity/schemaTypes/creepMap.ts` defines, and what the Studio
 * shows). The app's `CreepMap` type calls it `name`, matching the generated
 * catalogue JSON that `publish.mjs` uploads.
 *
 * A GROQ projection that selects bare `name` therefore returns `null` for
 * every published map — and nothing throws. In production that rendered a map
 * dropdown of twelve blank options, and made `getCreepMap(slug)` behave as if
 * the map did not exist. Dev never saw it because dev reads fixtures, which
 * do have `name`.
 *
 * These tests read the query sources and require the alias, so removing it
 * fails here rather than silently in production.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(DIR, f), "utf8");

/** A `name` selected straight out of a creepMap document, i.e. not aliased
 *  from `title`. Matches `name,` or `name }` but not `"name": coalesce(...)`. */
const BARE_NAME = /(?<!")\bname\b\s*[,}]/;

test("the map projection aliases the document's title to name", () => {
  const src = read("maps.ts");
  assert.match(src, /"name":\s*coalesce\(title,\s*name\)/, "maps.ts must alias title -> name");
});

test("the map list is ordered by a field that actually exists", () => {
  const src = read("maps.ts");
  assert.doesNotMatch(src, /order\(name\s+asc\)/, "ordering by bare `name` sorts every published map by null");
});

test("both route projections alias the referenced map's title to name", () => {
  const src = read("routes.ts");
  const aliases = src.match(/"name":\s*coalesce\(title,\s*name\)/g) ?? [];
  assert.equal(aliases.length, 2, "list and detail projections both need the alias");
  const mapSelections = src.match(/"map":\s*map->\{[^}]*\}/g) ?? [];
  assert.equal(mapSelections.length, 2);
  for (const sel of mapSelections) {
    assert.doesNotMatch(sel, BARE_NAME, `map projection selects a bare name: ${sel}`);
  }
});
