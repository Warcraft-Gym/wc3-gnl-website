import { test } from "node:test";
import assert from "node:assert/strict";
import { indexRecaps, recapSeason } from "./recap-match.mjs";

/** Every winner announcement on the site, verbatim. */
const WINNERS = [
  ["CRIT HAPPENS WINS GNL S18!", 18],
  ["DRUG LORDS WINS GNL S17!", 17],
  ["PITTY PARTY WINS GNL S16!", 16],
  ["GNL BEARS WIN GNL S15!", 15],
  ["Giggling Goblins got the Last Laugh.  GG wins GNL S14!", 14],
  ["TEAM FUMING CHICKEN WINS GNL S13! GNL got FuC’d.", 13],
  ["INTENSE FOCUS WINS GNL S12!", 12],
  ["SMALL LOSSES WINS GNL S11!", 11],
  ["JABBA LICK TEAM WINS GNL S10!", 10],
];

/** Posts that mention a season but announce no winner. All of these exist. */
const DECOYS = [
  "Signups are open for GNL Season 15!",
  "GNL Fantasy League S10 Recap",
  "GNL S12 Fantasy League Recap",
  "GNL Season 14 Fantasy Wrap-up",
  "End of GNL Season 8 Recap.   BM took first place!",
  "GNL Fantasy League S8 Week 3 Update",
];

test("every winner announcement is matched, whatever the wording", () => {
  for (const [title, season] of WINNERS) assert.equal(recapSeason(title), season, title);
});

test("a fantasy recap is not a season result, even with the season in it", () => {
  for (const title of DECOYS) assert.equal(recapSeason(title), null, title);
});

test("'GNL Season 15' is signups, not S15 — the letter after the S matters", () => {
  assert.equal(recapSeason("Signups are open for GNL Season 15!"), null);
  assert.equal(recapSeason("SOMEONE WINS GNL S15!"), 15);
});

test("junk input is null, not a crash", () => {
  for (const bad of [null, undefined, 42, "", "no season here"]) assert.equal(recapSeason(bad), null);
});

test("indexRecaps keys the posts by season", () => {
  const posts = WINNERS.map(([title], i) => ({ title, slug: `s${i}`, publishedAt: `2026-0${(i % 9) + 1}-01` }));
  const idx = indexRecaps([...posts, ...DECOYS.map((title) => ({ title, slug: "x" }))]);
  assert.equal(Object.keys(idx).length, WINNERS.length);
  assert.equal(idx[18].title, "CRIT HAPPENS WINS GNL S18!");
});

test("if a season has two announcements the later one wins", () => {
  const idx = indexRecaps([
    { title: "OLD WINS GNL S12!", slug: "old", publishedAt: "2023-05-10" },
    { title: "CORRECTION: NEW WINS GNL S12!", slug: "new", publishedAt: "2023-05-12" },
  ]);
  assert.equal(idx[12].slug, "new");
});

test("a non-array is handled", () => {
  assert.deepEqual(indexRecaps(null), {});
});
