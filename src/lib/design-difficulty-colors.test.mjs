/**
 * Difficulty colours: the site's badges moved to the green -> amber -> red
 * `--color-difficulty-beginner/intermediate/advanced` scale on 2026-09-25
 * (27a3209) because `win` and `arcane` are both blue (see
 * `src/components/builds/BuildBadges.tsx`'s `DifficultyBadge`). F009 found
 * two spots that were missed — the build-row stripe and the guide-page
 * badge — plus one more turned up by grepping for the same `win`/`arcane`/
 * `gold` pattern against a `beginner`/`intermediate`/`advanced` scale
 * (`GuideCard`'s own level chip, which shares `GuideLevel`'s three values
 * with `BuildDifficulty`).
 *
 * Reading the component source is the point, same rule as
 * `design-headings.test.mjs`: a test holding its own copy of the class
 * names would still pass after someone typed `before:bg-win` again. Each
 * check pulls out just the named mapping object, not the whole file — the
 * rest of a component legitimately uses `gold` for unrelated chrome (a
 * button, a kicker), so a whole-file "no gold" ban would be a false
 * positive there.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(HERE, rel), "utf8");

const LEVELS = ["beginner", "intermediate", "advanced"];
const OLD_TOKENS = ["win", "arcane", "gold"];

/** The body of the `const <name> = { ... }` (or `... = { ... } as const`)
 *  object literal named `name` in `src`. */
function mapping(src, name) {
  const m = src.match(new RegExp(`const ${name}[^=]*=\\s*\\{([^}]*)\\}`));
  assert.ok(m, `no "const ${name} = { ... }" found`);
  return m[1];
}

/** Asserts the named mapping in `src` maps every one of `LEVELS` to its own
 *  `--color-difficulty-<level>` token (as `difficulty-<level>`, the
 *  Tailwind utility name), and that none of the old `win`/`arcane`/`gold`
 *  classes survive in that mapping. */
function assertDifficultyScale(src, name) {
  const body = mapping(src, name);
  for (const level of LEVELS) {
    assert.match(body, new RegExp(`difficulty-${level}`), `${name} must use the difficulty-${level} token for "${level}"`);
  }
  for (const old of OLD_TOKENS) {
    assert.doesNotMatch(
      body,
      new RegExp(`\\b(?:bg|border|text)-${old}\\b`),
      `${name} still has a bare "${old}" class — the leftover F009 fixed`,
    );
  }
}

test("BuildRow's difficulty stripe uses the difficulty tokens, not win/arcane/gold", () => {
  assertDifficultyScale(read("../components/builds/BuildRow.tsx"), "ACCENT");
});

test("the guide page's difficulty badge uses the difficulty tokens, not win/arcane/gold", () => {
  assertDifficultyScale(read("../app/(site)/learn/guide/[slug]/page.tsx"), "LEVEL_TONE");
});

test("GuideCard's level chip uses the difficulty tokens, not win/arcane/gold (found by grep, F009)", () => {
  assertDifficultyScale(read("../components/learn/GuideCard.tsx"), "LEVEL_TONE");
});
