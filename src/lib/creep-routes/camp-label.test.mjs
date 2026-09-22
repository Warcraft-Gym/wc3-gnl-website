import assert from "node:assert/strict";
import test from "node:test";
import { campLabel, campComposition, conditionLabel } from "./camp-label.mjs";
import autumnLeaves from "./maps/autumn-leaves.json" with { type: "json" };

// c09: Giant Skeleton Warrior (lvl 3), Sludge Flinger (lvl 3), Skeleton
// Archer (lvl 1) — the exact camp the spec's own worked example uses.
const c09 = autumnLeaves.camps.find((c) => c.id === "c09");

test("campLabel: highest-level creep's name, +N for the rest, ties keep the data's own order", () => {
  assert.equal(campLabel(c09), "Giant Skeleton Warrior +2");
});

test("campLabel: a single-creep camp has no +N suffix", () => {
  assert.equal(
    campLabel({ id: "c99", creeps: [{ id: "nfoo", name: "Wildkin", level: 4, count: 1 }] }),
    "Wildkin",
  );
});

test("campLabel: a single creep entry with count > 1 still shows +N (extra bodies, not extra kinds)", () => {
  assert.equal(
    campLabel({ id: "c99", creeps: [{ id: "nfoo", name: "Forest Troll Berserker", level: 5, count: 3 }] }),
    "Forest Troll Berserker +2",
  );
});

test("campLabel: a strict level tie keeps the first creep in the camp's own array order, not alphabetical", () => {
  const camp = {
    id: "c50",
    creeps: [
      { id: "b", name: "Zzz Later Creep", level: 6, count: 1 },
      { id: "a", name: "Aaa First Creep", level: 6, count: 1 },
    ],
  };
  assert.equal(campLabel(camp), "Zzz Later Creep +1");
});

test("campLabel: falls back to the camp id when there are no creeps (should never happen for a real camp, but never throws)", () => {
  assert.equal(campLabel({ id: "c00", creeps: [] }), "c00");
});

test("campComposition: count× name per creep, joined by the middle dot, in the data's own order", () => {
  assert.equal(
    campComposition(c09),
    "1× Giant Skeleton Warrior · 1× Sludge Flinger · 1× Skeleton Archer",
  );
});

test("campComposition: multi-count creeps show the real count", () => {
  assert.equal(
    campComposition({ id: "c98", creeps: [{ id: "nftt", name: "Forest Troll Trapper", level: 3, count: 2 }] }),
    "2× Forest Troll Trapper",
  );
});

test("campComposition: an empty camp is an empty string, not a throw", () => {
  assert.equal(campComposition({ id: "c00", creeps: [] }), "");
});

test('conditionLabel: a condition that already starts with "if" renders unchanged', () => {
  assert.equal(conditionLabel("if harassed"), "if harassed");
});

test('conditionLabel: an author-written "Skip if…" is never double-prefixed', () => {
  assert.equal(
    conditionLabel("Skip if the Undead scouted this side"),
    "Skip if the Undead scouted this side",
  );
});

test('conditionLabel: plain text with no trigger word gets a leading "If "', () => {
  assert.equal(conditionLabel("harassed"), "If harassed");
});

test("conditionLabel: every recognised trigger word is left alone, case-insensitively", () => {
  assert.equal(conditionLabel("When the scout leaves"), "When the scout leaves");
  assert.equal(conditionLabel("unless you're ahead"), "unless you're ahead");
  assert.equal(conditionLabel("ONLY on the standard build"), "ONLY on the standard build");
  assert.equal(conditionLabel("After the first Fiend"), "After the first Fiend");
  assert.equal(conditionLabel("before minute 5"), "before minute 5");
});

test("conditionLabel: empty/undefined condition is left as an empty string", () => {
  assert.equal(conditionLabel(""), "");
  assert.equal(conditionLabel(undefined), "");
});
