/**
 * The display register: headings are uppercase, names are not.
 *
 * This exists because #27 split the one `h1, h2, h3, h4` rule in two and
 * dropped `text-transform` from the second, along with `font-display` and a
 * `tracking-[…]` on about 150 component sites. Nothing failed. The site
 * simply stopped shouting, it was noticed by eye weeks later, and it read as
 * a bug rather than as the decision it was. #27 was reverted.
 *
 * Reading the stylesheet is the point. A test holding its own copy of the
 * rule would still pass after someone edited the real one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, "../app/globals.css"), "utf8");

/** The body of the rule whose selector list is exactly `selector`. */
function rule(selector) {
  const m = CSS.match(new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `no rule for "${selector}" in globals.css`);
  return m[1];
}

test("every heading level shares one uppercase display rule", () => {
  // Splitting this selector is exactly how the register was lost. If a
  // redesign wants mixed-case headings, change this test in the same commit
  // so the choice is visible in review.
  const body = rule("h1, h2, h3, h4");
  assert.match(body, /text-transform:\s*uppercase/, "headings lost text-transform: uppercase");
  assert.match(body, /font-family:\s*var\(--wg-font-display\)/, "headings lost the display face");
  assert.match(body, /letter-spacing/, "headings lost their tracking");
});

test("a name opts out of the case and of the tracking", () => {
  // Uppercase tracking on mixed-case text reads as a spacing bug, so the
  // escape hatch has to clear both or it only half works.
  const body = rule(".wg-name");
  assert.match(body, /text-transform:\s*none/, ".wg-name must clear the uppercase");
  assert.match(body, /letter-spacing:\s*normal/, ".wg-name must clear the tracking");
});

test("player and team names still carry .wg-name", () => {
  // The names people chose are the one thing the register does not shout.
  // Listed explicitly: a name rendered in a new place is a deliberate
  // decision, not something that should inherit silently.
  const sites = {
    "app/(site)/gnl/players/[slug]/page.tsx": 3,
    "app/(site)/gnl/teams/[slug]/page.tsx": 2,
    "app/(site)/gnl/champions/page.tsx": 3,
    "app/(site)/gnl/ladder/page.tsx": 1,
    "components/league/StandingsTable.tsx": 1,
    "components/league/LadderTeams.tsx": 1,
    "components/league/TeamFixtureRow.tsx": 1,
    "components/league/FantasyStandings.tsx": 1,
    "components/home/TeamMedallions.tsx": 1,
    "components/builds/BuildImportZone.tsx": 1,
  };
  for (const [file, expected] of Object.entries(sites)) {
    const src = readFileSync(join(HERE, "..", file), "utf8");
    const found = (src.match(/wg-name/g) ?? []).length;
    assert.equal(found, expected, `${file}: expected ${expected} .wg-name site(s), found ${found}`);
  }
});
