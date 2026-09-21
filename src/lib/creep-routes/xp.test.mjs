import assert from "node:assert/strict";
import test from "node:test";
import { creepXp, heroXpForLevel, creepXpFactor, heroLevelAfter } from "./xp.mjs";

test("creepXp follows the sourced table for levels 1-10", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(creepXp),
    [25, 40, 60, 85, 115, 150, 190, 235, 285, 340],
  );
});

test("heroXpForLevel follows the sourced table for levels 1-6", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map(heroXpForLevel),
    [0, 200, 500, 900, 1400, 2000],
  );
});

test("creepXpFactor tapers off from hero level 5", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(creepXpFactor), [0.8, 0.7, 0.6, 0.5, 0, 0]);
});

test("heroLevelAfter worked example: camps [3,3,2] then [4,4,3] from level 1", () => {
  const result = heroLevelAfter([[3, 3, 2], [4, 4, 3]], 1);
  assert.deepEqual(result.perCamp, [
    { level: 1, xp: 128 },
    { level: 2, xp: 312 },
  ]);
  assert.equal(result.level, 2);
  assert.equal(result.xp, 312);
});
