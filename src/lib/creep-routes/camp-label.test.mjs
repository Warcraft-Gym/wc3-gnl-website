import assert from "node:assert/strict";
import test from "node:test";
import { campLabel, campComposition, campSpotTitle, creepDropKind, dropKey, dropKind, dropSetLabel } from "./camp-label.mjs";
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

test("campSpotTitle: band word (capitalised) + Creep Spot + summed level in brackets, Liquipedia's own wording", () => {
  assert.equal(campSpotTitle({ band: "medium", level: 16 }), "Medium Creep Spot [16]");
  assert.equal(campSpotTitle({ band: "easy", level: 9 }), "Easy Creep Spot [9]");
  assert.equal(campSpotTitle({ band: "hard", level: 24 }), "Hard Creep Spot [24]");
});

test("campSpotTitle: an unknown/missing band never invents a band word", () => {
  assert.equal(campSpotTitle({ band: undefined, level: 5 }), "Creep Spot [5]");
  assert.equal(campSpotTitle({ level: 5 }), "Creep Spot [5]");
});

test("dropSetLabel: a random-pool drop set reads \"Level N, <Class>\", PowerUp spaced as Liquipedia writes it", () => {
  assert.equal(dropSetLabel({ kind: "class", class: "Permanent", level: 3, chance: 100, items: [] }), "Level 3, Permanent");
  assert.equal(dropSetLabel({ kind: "class", class: "PowerUp", level: 1, chance: 100, items: [] }), "Level 1, Power Up");
});

test("dropSetLabel: a concrete item drop reads the item's own name", () => {
  assert.equal(
    dropSetLabel({ kind: "item", id: "ckng", chance: 100, items: [{ id: "ckng", name: "Crown of Kings +5", icon: "BTNCrownOfKings" }] }),
    "Crown of Kings +5",
  );
});

test("dropSetLabel: a concrete item with no resolved items[] falls back to \"Item\", never throws", () => {
  assert.equal(dropSetLabel({ kind: "item", id: "zzzz", chance: 100, items: [] }), "Item");
});

test("dropSetLabel: a missing drop is an empty string, not a throw", () => {
  assert.equal(dropSetLabel(undefined), "");
});

test("dropKind: Power Up pools are red, every other set is blue", () => {
  assert.equal(dropKind({ kind: "class", class: "PowerUp", level: 1 }), "powerup");
  assert.equal(dropKind({ kind: "class", class: "Permanent", level: 3 }), "item");
  assert.equal(dropKind({ kind: "item", id: "ckng" }), "item");
});

test("creepDropKind: one kind, both kinds, or null without drops", () => {
  assert.equal(creepDropKind({ drops: [{ kind: "class", class: "PowerUp", level: 1 }] }), "powerup");
  assert.equal(creepDropKind({ drops: [{ kind: "item", id: "ckng" }] }), "item");
  assert.equal(creepDropKind({ drops: [{ kind: "class", class: "PowerUp", level: 1 }, { kind: "item", id: "ckng" }] }), "both");
  assert.equal(creepDropKind({ drops: [] }), null);
  assert.equal(creepDropKind({}), null);
});

test("dropKey: one key per pool or fixed item", () => {
  assert.equal(dropKey({ kind: "class", class: "PowerUp", level: 1 }), "class:PowerUp:1");
  assert.equal(dropKey({ kind: "item", id: "ckng" }), "item:ckng");
});
