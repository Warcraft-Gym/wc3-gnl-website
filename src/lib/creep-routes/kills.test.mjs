import assert from "node:assert/strict";
import test from "node:test";
import { addKill, campKills, creepsLeft, flatKillItems, flatKills, joinWithPrevious, killRows, killStepsByRow, killUnits, killedXpShare, killsProblem, mergeKills, removeKillAt, splitSet, unorderedCreeps, validKills, halfPath } from "./kills.mjs";

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

test("rows outside the camp are dropped and n is capped at the row's count", () => {
  assert.deepEqual(validKills(CAMP, [{ row: 7, n: 1 }, { row: 2, n: 5 }, { row: 2, n: 1 }]), [{ row: 2, n: 2 }]);
  // Only out-of-camp rows: no kill order, so the whole camp dies even with leaveRest.
  assert.deepEqual(killRows(CAMP, [{ row: 7, n: 1 }], true), [0, 1, 2, 2, 3]);
  assert.equal(killedXpShare(CAMP, [{ row: 7, n: 1 }], true), 1);
  assert.equal(unorderedCreeps(CAMP, [{ row: 7, n: 1 }]).length, 5);
  assert.deepEqual(killStepsByRow(CAMP, [{ row: 7, n: 1 }, { row: 1, n: 1 }]), [[], [1], [], []]);
  // Over-count: no extra kills, never negative left, share at most 1.
  assert.deepEqual(killRows(CAMP, [{ row: 2, n: 5 }]), [2, 2, 0, 1, 3]);
  assert.equal(creepsLeft(CAMP, [{ row: 2, n: 5 }], true), 3);
  assert.deepEqual(killStepsByRow(CAMP, [{ row: 2, n: 5 }]), [[], [], [1, 2], []]);
  assert.ok(killedXpShare(CAMP, [{ row: 3, n: 3 }], true) <= 1);
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

test("halfPath cuts the upper-left half on the diagonal", () => {
  assert.equal(halfPath(10, 10, 5), "M13.54 6.46A5 5 0 0 0 6.46 13.54Z");
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

test("killUnits: singles, a leading set, and the rest as a trailing set", () => {
  const kills = [{ row: 0, n: 1, set: 0 }, { row: 3, n: 1, set: 0 }, { row: 1, n: 1 }];
  assert.deepEqual(
    killUnits(CAMP, kills).map((k) => [k.row, k.unit, k.inSet, k.ordered]),
    [[0, 0, true, true], [3, 0, true, true], [1, 1, false, true], [2, 2, true, false], [2, 2, true, false]],
  );
  // leaveRest drops the trailing set; no kill list is one set.
  assert.equal(killUnits(CAMP, kills, true).length, 3);
  assert.deepEqual(new Set(killUnits(CAMP, []).map((k) => k.unit)), new Set([0]));
  // A set's members share one Kill step on the camp card.
  assert.deepEqual(killStepsByRow(CAMP, kills), [[1], [2], [], [1]]);
});

test("sets: validKills keeps set, killsProblem rejects a split set, addKill never merges into a set", () => {
  assert.deepEqual(validKills(CAMP, [{ row: 2, n: 1, set: 4 }]), [{ row: 2, n: 1, set: 4 }]);
  assert.equal(killsProblem([{ row: 0, n: 1, set: 0 }, { row: 1, n: 1, set: 0 }], COUNTS), null);
  assert.match(killsProblem([{ row: 0, n: 1, set: 0 }, { row: 3, n: 1 }, { row: 1, n: 1, set: 0 }], COUNTS), /next to each other/);
  assert.deepEqual(addKill([{ row: 2, n: 1, set: 0 }], 2, COUNTS), [{ row: 2, n: 1, set: 0 }, { row: 2, n: 1 }]);
});

test("builder edits: join, split, and removing leaves no one-member set", () => {
  // Two singles join into a new set; a third joins the set before it.
  let kills = [{ row: 0, n: 1 }, { row: 1, n: 1 }, { row: 3, n: 1 }];
  kills = joinWithPrevious(kills, 1);
  assert.deepEqual(kills, [{ row: 0, n: 1, set: 0 }, { row: 1, n: 1, set: 0 }, { row: 3, n: 1 }]);
  kills = joinWithPrevious(kills, 2);
  assert.deepEqual(kills.map((k) => k.set), [0, 0, 0]);
  assert.deepEqual(splitSet(kills, 0), [{ row: 0, n: 1 }, { row: 1, n: 1 }, { row: 3, n: 1 }]);
  // Removing from a two-member set turns the survivor into a single.
  assert.deepEqual(removeKillAt([{ row: 0, n: 1, set: 0 }, { row: 1, n: 1, set: 0 }], 0), [{ row: 1, n: 1 }]);
  assert.deepEqual(flatKillItems([{ row: 2, n: 2, set: 1 }]), [{ row: 2, set: 1 }, { row: 2, set: 1 }]);
});
