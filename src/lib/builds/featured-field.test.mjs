/**
 * The homepage's featured build is driven by a boolean stored as `featured`.
 * Its Studio label has been renamed once already ("Build of the week" →
 * "Show on homepage"), and the label is the safe half of that edit: renaming
 * the *field* is the one that breaks things, silently.
 *
 * Every read of it is `coalesce(featured, false)` or `b.featured`, so a
 * renamed field does not throw — it just reads false for every build, the
 * homepage quietly falls back to "newest build", and nobody finds out until
 * someone notices the wrong card. Dev would not catch it either: the fixtures
 * carry their own `featured`, so only production reads the document.
 *
 * These read the sources and require the stored names to survive, so a future
 * relabel fails here instead.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

test("the buildOrder schema still stores the flag as `featured`", () => {
  const src = read("src/sanity/schemaTypes/buildOrder.ts");
  assert.match(src, /name:\s*"featured"/, "the stored field name must not follow the label");
});

test("the creepRoute schema still stores the flag as `featured`", () => {
  assert.match(read("src/sanity/schemaTypes/creepRoute.ts"), /name:\s*"featured"/);
});

test("the homepage reads that same field", () => {
  assert.match(read("src/app/(site)/page.tsx"), /\.featured\b/);
});

test("the route projection still selects it, defaulting to false", () => {
  const src = read("src/lib/creep-routes/routes.ts");
  assert.match(src, /"featured":\s*coalesce\(featured,\s*false\)/);
});

test("the label is the editor-facing half, and says what it does", () => {
  const src = read("src/sanity/schemaTypes/buildOrder.ts");
  assert.match(src, /title:\s*"Show on homepage"/);
  assert.ok(!src.includes("Build of the week"), "the old label should be gone");
  assert.match(src, /description:[\s\S]{0,140}home page/, "the description must describe where it actually shows");
});
