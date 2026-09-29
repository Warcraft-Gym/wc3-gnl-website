import assert from "node:assert/strict";
import test from "node:test";
import { addKill, addRestOfCamp, campKills, creepsLeft, flatKills, killStepsByRow, killsProblem, leftRows, mergeKills, routeHasPartialStop, wedgePath } from "./kills.mjs";

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

test("a kill list counts only its creeps, in its order", () => {
  const kills = [{ row: 3, n: 1 }, { row: 0, n: 1 }];
  assert.deepEqual(campKills(CAMP, kills).map((c) => c.name), ["Ogre Magi", "Troll (item)"]);
  assert.equal(creepsLeft(CAMP, kills), 3);
  assert.deepEqual(killStepsByRow(CAMP, kills), [[2], [], [], [1]]);
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

test("addRestOfCamp finishes the camp after the chosen kills", () => {
  const kills = addRestOfCamp([{ row: 3, n: 1 }], COUNTS);
  assert.deepEqual(kills, [{ row: 3, n: 1 }, { row: 0, n: 1 }, { row: 1, n: 1 }, { row: 2, n: 2 }]);
  assert.equal(creepsLeft(CAMP, kills), 0);
});

test("wedgePath draws a half circle for one half, from 12 o'clock", () => {
  assert.equal(wedgePath(10, 10, 5, 0.5), "M10 10L10 5A5 5 0 0 1 10.00 15.00Z");
});

test("leftRows names what a partial stop leaves alive", () => {
  const left = leftRows(CAMP, [{ row: 3, n: 1 }, { row: 2, n: 1 }]);
  assert.deepEqual(left.map((r) => [r.creep.name, r.n]), [["Troll (item)", 1], ["Troll", 1], ["Ogre", 1]]);
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

test("routeHasPartialStop is true only when a stop leaves creeps alive", () => {
  assert.equal(routeHasPartialStop([{ left: 0 }, { left: 0 }]), false);
  assert.equal(routeHasPartialStop([{ left: 0 }, { left: 2 }]), true);
  assert.equal(routeHasPartialStop([]), false);
});
