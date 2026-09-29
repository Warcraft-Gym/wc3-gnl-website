import assert from "node:assert/strict";
import test from "node:test";
import { addKill, campKills, creepsLeft, flatKills, killRows, killStepsByRow, killsProblem, killedXpShare, mergeKills, unorderedCreeps, wedgePath } from "./kills.mjs";

// Shaped like Last Refuge c04: two Forest Troll rows split by item drop.
const CAMP = {
  creeps: [
    { id: "nftt", name: "Troll (item)", level: 3, count: 1 },
    { id: "nftt", name: "Troll", level: 3, count: 1 },
    { id: "nogr", name: "Ogre", level: 3, count: 2 },
    { id: "nomg", name: "Ogre Magi", level: 5, count: 1 },
  ],
};
const COUNTS = CAMP.creeps.map((c) => c.count);

test("no kill list means the whole camp, in catalogue order", () => {
  assert.deepEqual(campKills(CAMP, undefined).map((c) => c.name), ["Troll (item)", "Troll", "Ogre", "Ogre", "Ogre Magi"]);
  assert.equal(creepsLeft(CAMP, []), 0);
});

test("a kill list is the ordered prefix; the rest dies after it unless leaveRest", () => {
  const kills = [{ row: 3, n: 1 }, { row: 0, n: 1 }];
  // Prefix first, then the rest in catalogue order.
  assert.deepEqual(campKills(CAMP, kills).map((c) => c.name), ["Ogre Magi", "Troll (item)", "Troll", "Ogre", "Ogre"]);
  assert.equal(creepsLeft(CAMP, kills), 0);
  assert.deepEqual(killRows(CAMP, kills), [3, 0, 1, 2, 2]);
  // leaveRest keeps only the prefix.
  assert.deepEqual(campKills(CAMP, kills, true).map((c) => c.name), ["Ogre Magi", "Troll (item)"]);
  assert.equal(creepsLeft(CAMP, kills, true), 3);
  // leaveRest means nothing without a prefix: the whole camp dies.
  assert.equal(creepsLeft(CAMP, [], true), 0);
  assert.deepEqual(killStepsByRow(CAMP, kills), [[2], [], [], [1]]);
  assert.deepEqual(killStepsByRow(CAMP, [{ row: 2, n: 2 }]), [[], [], [1, 2], []]);
});

test("killsProblem rejects an unknown row and more kills than creeps", () => {
  assert.equal(killsProblem([{ row: 2, n: 2 }], COUNTS), null);
  assert.match(killsProblem([{ row: 4, n: 1 }], COUNTS), /Unknown creep/);
  assert.match(killsProblem([{ row: 2, n: 1 }, { row: 2, n: 2 }], COUNTS), /More kills/);
});

test("addKill merges a repeat of the last row and stops at the row's count", () => {
  let kills = addKill([], 2, COUNTS);
  kills = addKill(kills, 2, COUNTS);
  assert.deepEqual(kills, [{ row: 2, n: 2 }]);
  assert.equal(addKill(kills, 2, COUNTS), kills);
});

test("wedgePath draws a half circle for one half, from 12 o'clock", () => {
  assert.equal(wedgePath(10, 10, 5, 0.5), "M10 10L10 5A5 5 0 0 1 10.00 15.00Z");
});

test("unorderedCreeps lists each creep not in the kill list, one per creep", () => {
  const left = unorderedCreeps(CAMP, [{ row: 3, n: 1 }, { row: 2, n: 1 }]);
  assert.deepEqual(left.map((r) => [r.creep.name, r.row]), [["Troll (item)", 0], ["Troll", 1], ["Ogre", 2]]);
  // An empty list leaves the whole camp to choose from.
  assert.equal(unorderedCreeps(CAMP, []).length, 5);
  assert.deepEqual(unorderedCreeps(CAMP, [{ row: 0, n: 1 }, { row: 1, n: 1 }, { row: 2, n: 2 }, { row: 3, n: 1 }]), []);
});

test("killedXpShare weighs kills by base creep XP, not by count", () => {
  // creepXp: level 3 = 60, level 5 = 115. Camp total = 60*4 + 115 = 355.
  assert.equal(killedXpShare(CAMP, [{ row: 3, n: 1 }], true), 115 / 355);
  assert.equal(killedXpShare(CAMP, [{ row: 0, n: 1 }], true), 60 / 355);
  assert.equal(killedXpShare(CAMP, undefined), 1);
  // Without leaveRest the rest dies too: the whole camp.
  assert.equal(killedXpShare(CAMP, [{ row: 3, n: 1 }]), 1);
});

test("flatKills and mergeKills round-trip, and removing one kill re-merges", () => {
  const kills = [{ row: 2, n: 2 }, { row: 0, n: 1 }, { row: 2, n: 1 }];
  assert.deepEqual(flatKills(kills), [2, 2, 0, 2]);
  assert.deepEqual(mergeKills(flatKills(kills)), kills);
  // Remove the lone troll: the ogres on either side merge into one step.
  const rows = flatKills(kills).filter((_, i) => i !== 2);
  assert.deepEqual(mergeKills(rows), [{ row: 2, n: 3 }]);
  assert.deepEqual(flatKills(undefined), []);
});
