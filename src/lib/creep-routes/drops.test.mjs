import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classifyItemId, campDrops, expandPool, POOL_OVERRIDES } from "../../../scripts/creep-maps/drops.mjs";

test("classifyItemId decodes random-pool codes by class letter", () => {
  assert.deepEqual(classifyItemId("YiI3"), { kind: "class", class: "Permanent", level: 3 });
  assert.deepEqual(classifyItemId("YjI2"), { kind: "class", class: "Charged", level: 2 });
  assert.deepEqual(classifyItemId("YkI1"), { kind: "class", class: "PowerUp", level: 1 });
  assert.deepEqual(classifyItemId("YlI7"), { kind: "class", class: "Artifact", level: 7 });
  assert.deepEqual(classifyItemId("YmI2"), { kind: "class", class: "Purchasable", level: 2 });
  assert.deepEqual(classifyItemId("YnI1"), { kind: "class", class: "Campaign", level: 1 });
  assert.deepEqual(classifyItemId("YoI1"), { kind: "class", class: "Miscellaneous", level: 1 });
});

test("classifyItemId decodes YYI<n> as any class", () => {
  assert.deepEqual(classifyItemId("YYI4"), { kind: "class", class: "Any", level: 4 });
});

test("classifyItemId falls back to a concrete item for anything else", () => {
  assert.deepEqual(classifyItemId("ckng"), { kind: "item", id: "ckng" });
  assert.deepEqual(classifyItemId("rej3"), { kind: "item", id: "rej3" });
  // Looks close to the pattern but the 2nd char isn't a known class letter.
  assert.deepEqual(classifyItemId("YzI3"), { kind: "item", id: "YzI3" });
});

test("campDrops unions and dedupes across creeps, keeping the highest chance", () => {
  const units = [
    { droppedItemSets: [{ items: [{ itemId: "YiI2", chance: 30 }] }] },
    { droppedItemSets: [{ items: [{ itemId: "YiI2", chance: 80 }, { itemId: "ckng", chance: 10 }] }] },
  ];
  const drops = campDrops(units);
  assert.deepEqual(drops, [
    { kind: "class", class: "Permanent", level: 2, chance: 80, items: [] },
    { kind: "item", id: "ckng", chance: 10, items: [] },
  ]);
});

test("campDrops ignores units with no drop sets and sets with zero items", () => {
  const units = [
    { droppedItemSets: [] },
    { droppedItemSets: [{ items: [] }] },
    {},
  ];
  assert.deepEqual(campDrops(units), []);
});

test("campDrops resolves a unit's itemTablePointer against the map-level random item tables", () => {
  const units = [{ droppedItemSets: [], itemTablePointer: 2 }];
  const randomItemTables = [
    { id: 1, name: "unrelated", sets: [[{ itemId: "ckng", chance: 100 }]] },
    { id: 2, name: "table two", sets: [[{ itemId: "YjI3", chance: 50 }], [{ itemId: "rwat", chance: 25 }]] },
  ];
  const drops = campDrops(units, randomItemTables);
  assert.deepEqual(drops, [
    { kind: "class", class: "Charged", level: 3, chance: 50, items: [] },
    { kind: "item", id: "rwat", chance: 25, items: [] },
  ]);
});

test("campDrops ignores itemTablePointer === -1 (no table) and an unmatched pointer", () => {
  assert.deepEqual(campDrops([{ droppedItemSets: [], itemTablePointer: -1 }], [{ id: 5, sets: [] }]), []);
  assert.deepEqual(campDrops([{ droppedItemSets: [], itemTablePointer: 99 }], [{ id: 5, sets: [] }]), []);
});

function itemdataIndex(rows) {
  return new Map(rows.map((r) => [r.itemID, r]));
}

// Uses "Artifact" (no POOL_OVERRIDES entry at any level, see below) to test
// the raw pickRandom/class/Level filter in isolation from F011-followup-1's
// corrections.
test("expandPool filters by class, level and pickRandom===1, sorted", () => {
  const index = itemdataIndex([
    { itemID: "clsd", class: "Artifact", Level: "1", pickRandom: "1" },
    { itemID: "afac", class: "Artifact", Level: "1", pickRandom: "1" },
    { itemID: "gemt", class: "Artifact", Level: "1", pickRandom: "0" },
    { itemID: "ckng", class: "Artifact", Level: "1", pickRandom: "1" },
    { itemID: "desc", class: "Artifact", Level: "2", pickRandom: "1" },
  ]);
  assert.deepEqual(expandPool(index, "Artifact", 1), ["afac", "ckng", "clsd"]);
  assert.deepEqual(expandPool(index, "Artifact", 2), ["desc"]);
  assert.deepEqual(expandPool(index, "Artifact", 9), []);
});

test("expandPool with class 'Any' matches every class at that level", () => {
  const index = itemdataIndex([
    { itemID: "a", class: "Artifact", Level: "3", pickRandom: "1" },
    { itemID: "b", class: "Purchasable", Level: "3", pickRandom: "1" },
    { itemID: "c", class: "Purchasable", Level: "4", pickRandom: "1" },
  ]);
  assert.deepEqual(expandPool(index, "Any", 3), ["a", "b"]);
});

// F011-followup-1: POOL_OVERRIDES corrects the raw filter's disagreement
// with Liquipedia's published pools (evidence/liquipedia-pools.json) — see
// drops.mjs's own doc comment for the full investigation and per-pool
// citations. This exercises the add/remove mechanics against a synthetic
// index so it doesn't depend on the real itemdata.slk shape.
test("expandPool applies POOL_OVERRIDES on top of the raw filter", () => {
  const index = itemdataIndex([
    // fgsk (Book of the Dead): a genuine raw-filter match that stays.
    { itemID: "fgsk", class: "Charged", Level: "4", pickRandom: "1" },
    // wcyc (Wand of the Wind): a raw-filter match POOL_OVERRIDES removes
    // (real column evidence in drops.mjs: identical shape to fgsk, but not
    // a live pool member).
    { itemID: "wcyc", class: "Charged", Level: "4", pickRandom: "1" },
    // ankh (Ankh of Reincarnation): its own Level column reads 5, so the
    // raw filter never finds it at Level 4 — POOL_OVERRIDES adds it back.
    { itemID: "ankh", class: "Charged", Level: "5", pickRandom: "1" },
  ]);
  // POOL_OVERRIDES["Charged|4"] also adds "whwd" (Healing Wards, same
  // Level-reads-5 situation as ankh) — expandPool adds override ids
  // unconditionally (it doesn't require them to already be in the index),
  // since two of the four ids POOL_OVERRIDES ever adds aren't resolvable
  // via itemdata.slk at all (see EXTRA_ITEM_INFO); `whwd` is a real id
  // here, just not one this synthetic index happens to carry.
  assert.deepEqual(expandPool(index, "Charged", 4), ["ankh", "fgsk", "whwd"]);
  assert.ok(POOL_OVERRIDES["Charged|4"].remove.includes("wcyc"));
  assert.ok(POOL_OVERRIDES["Charged|4"].add.includes("ankh"));
});

// --- Autumn Leaves cross-check vs Liquipedia (spec's evidence/liquipedia-
// autumn-leaves-preview.json, the site's own `parse` API output) ---
//
// Liquipedia's 20 creep-spots collapse to 10 distinct creep compositions
// (mostly mirrored pairs — this map is point-symmetric). Per unique
// composition, its "Level N, <Class>" item-pool listing, transcribed
// directly from the evidence file (band/level/creep list cross-checked
// too, not just the pools):
//   A. easy L7  Gnoll Warden L3 + Frost Wolf L2 x2           -> (no items shown)
//   B. easy L9  Forest Troll Berserker L4 + Trapper L3 + Frost Wolf L2 -> Permanent L2
//   C. easy L5  Sludge Flinger L3 + Skeleton Warrior L1 + Skeleton Archer L1 -> Permanent L1
//   D. easy L8  Rogue Wizard L3 + Brigand L2 x2 + Apprentice Wizard L1 -> Charged L2
//   E. medium L13 Gnoll Overseer L5 + Enforcer L5 + Gnoll Assassin L3 -> Charged L3
//   F. medium L11 Ogre Magi L5 + Forest Troll Trapper L3 x2  -> Permanent L1
//   G. medium L14 Kobold Taskmaster L5 + Geomancer L3 x2 + Tunneler L3 -> Permanent L3
//   H. medium L19 Forest Troll Warlord L6 + Sasquatch L5 + High Priest L4 + Berserker L4 (unmirrored) -> Charged L4
//   I. medium L12 Sasquatch L5 + Forest Troll Berserker L4 + Trapper L3 -> Permanent L2
//   J. medium L17 Enraged Wildkin L6 + Gnoll Overseer L5 + Gnoll Warden L3 + Assassin L3 (unmirrored) -> Permanent L4
//   K. hard L21 Granite Golem L9 + Dire Frost Wolf L6 x2     -> Permanent L5
//
// Matched against our own build (`maps/autumn-leaves.json`) by camp id —
// ids are stable across regenerations (verified by every earlier feature
// that touched this pipeline), so this is exact, not a heuristic match.
const LIQUIPEDIA_POOLS_BY_CAMP = {
  c01: ["class:Charged:4"], // H
  c02: ["class:Permanent:4"], // J
  c05: ["class:Permanent:2"], // B
  c06: ["class:Permanent:2"], // B
  c07: ["class:Permanent:2"], // I
  c08: ["class:Permanent:2"], // I
  c09: ["class:Permanent:1"], // C
  c10: ["class:Permanent:1"], // C
  c11: ["class:Charged:3"], // E
  c14: ["class:Charged:3"], // E
  c15: ["class:Permanent:5"], // K
  c16: ["class:Permanent:5"], // K
  c17: ["class:Permanent:3"], // G
  c18: ["class:Permanent:3"], // G
  c19: ["class:Charged:2"], // D
  c20: ["class:Charged:2"], // D
};

// c03/c04 (F) and c12/c13 (A) carry one *more* pool than Liquipedia's page
// shows — verified directly against the real `war3mapUnits.doo` bytes (not
// a parser artifact): Ogre Magi's own unit entry carries two independent
// drop sets (Permanent L1 *and* Power Up L2), and Gnoll Warden's carries
// its own Power Up L1 set. Liquipedia's preview only lists one pool for
// each of these two camps — a map-revision/extraction gap on their side,
// not ours; our extra entries are a strict superset of theirs.
const LIQUIPEDIA_SUPERSET_CAMPS = {
  c03: ["class:Permanent:1", "class:PowerUp:2"], // F ∪ {Power Up L2}
  c04: ["class:Permanent:1", "class:PowerUp:2"],
  c12: ["class:PowerUp:1"], // A ∪ {Power Up L1} (A itself has none)
  c13: ["class:PowerUp:1"],
};

function dropKey(drop) {
  return drop.kind === "class" ? `class:${drop.class}:${drop.level}` : `item:${drop.id}`;
}

test("Autumn Leaves camp drops match Liquipedia's own preview for at least 5 camps (16 of 20 match exactly)", () => {
  const path = fileURLToPath(new URL("./maps/autumn-leaves.json", import.meta.url));
  const catalogue = JSON.parse(readFileSync(path, "utf8"));
  const campsById = new Map(catalogue.camps.map((c) => [c.id, c]));

  let exactMatches = 0;
  const mismatches = [];
  for (const [campId, expected] of Object.entries(LIQUIPEDIA_POOLS_BY_CAMP)) {
    const camp = campsById.get(campId);
    assert.ok(camp, `catalogue is missing camp ${campId}`);
    const actual = camp.drops.map(dropKey).sort();
    if (JSON.stringify(actual) === JSON.stringify([...expected].sort())) {
      exactMatches++;
    } else {
      mismatches.push({ campId, expected, actual });
    }
  }
  assert.deepEqual(mismatches, [], `unexpected drop mismatches: ${JSON.stringify(mismatches)}`);
  assert.ok(exactMatches >= 5, `only ${exactMatches} camps matched Liquipedia exactly`);
  assert.equal(exactMatches, 16);

  // The two known-superset camp types: our data is Liquipedia's plus one
  // real extra pool each — verified above against the raw .doo bytes.
  for (const [campId, expected] of Object.entries(LIQUIPEDIA_SUPERSET_CAMPS)) {
    const camp = campsById.get(campId);
    const actual = camp.drops.map(dropKey).sort();
    assert.deepEqual(actual, [...expected].sort(), `camp ${campId} superset drift from the documented explanation`);
  }
});
