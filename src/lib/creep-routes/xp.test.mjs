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

test("heroLevelAfter worked example: camps [3,3,2] then [4,4,3] from level 1, factor applied per kill", () => {
  // Per docs/creep-routes.md's "XP model": creepXpFactor is re-read at the
  // hero's current level on every kill, not fixed once per camp.
  // Camp 1: three kills at level 1 (0.8 factor throughout, 128 xp total,
  // still under 200 so still level 1): floor(60*.8)=48, +48=96, +floor(40*.8)=32 -> 128.
  // Camp 2: floor(85*.8)=68 -> 196 (L1); floor(85*.8)=68 -> 264 (L2, crosses
  // 200); floor(60*.7)=42 (now the level-2 factor) -> 306 (L2).
  const result = heroLevelAfter([[3, 3, 2], [4, 4, 3]], 1);
  assert.deepEqual(result.perCamp, [
    { level: 1, xp: 128 },
    { level: 2, xp: 306 },
  ]);
  assert.equal(result.level, 2);
  assert.equal(result.xp, 306);
});

test("heroLevelAfter floors XP per creep grant, not the running total: a level-4 creep at hero level 4 grants floor(85 * 0.5) = 42, not 42.5", () => {
  // Starting already at level 4 (900 xp) so creepXpFactor is the 0.5 tier.
  const result = heroLevelAfter([[4]], 4);
  assert.deepEqual(result.perCamp, [{ level: 4, xp: 942 }]);
  assert.equal(result.xp, 942);
  assert.equal(Number.isInteger(result.xp), true);
});

/* ------------------------------------------------------------------ *
 *  The citation, made executable
 *
 *  `xp.mjs` says its numbers come from Blizzard's `Units/MiscGame.txt`
 *  (patch 1.27.1). These tests re-derive the tables from the constants that
 *  file publishes, so the claim is verified rather than asserted — and a
 *  well-meant "correction" to one of the hardcoded values fails here.
 * ------------------------------------------------------------------ */

/** Verbatim from MiscGame.txt, enUS 1.27.1. */
const MISC_GAME = {
  GrantNormalXP: 25,
  GrantNormalXPFormulaB: 5,
  GrantNormalXPFormulaC: 5,
  NeedHeroXP: 200,
  NeedHeroXPFormulaB: 100,
  NeedHeroXPFormulaC: 0,
  HeroFactorXP: [80, 70, 60, 50, 0],
};

/** A creep of `level` is worth `GrantNormalXP` plus `B*l + C` for every level
 *  above the first. */
function grantNormalXp(level) {
  let xp = MISC_GAME.GrantNormalXP;
  for (let l = 2; l <= level; l++) xp += MISC_GAME.GrantNormalXPFormulaB * l + MISC_GAME.GrantNormalXPFormulaC;
  return xp;
}

/** Cumulative XP needed to *be* `level`: `B*l + C` per step, which yields
 *  `NeedHeroXP` for level 2. */
function needHeroXp(level) {
  let xp = 0;
  for (let l = 2; l <= level; l++) xp += MISC_GAME.NeedHeroXPFormulaB * l + MISC_GAME.NeedHeroXPFormulaC;
  return xp;
}

test("creepXp reproduces GrantNormalXP's formula for levels 1-10", () => {
  for (let level = 1; level <= 10; level++) {
    assert.equal(creepXp(level), grantNormalXp(level), `creep level ${level}`);
  }
  // Spot values, so a formula that drifts in both places still fails.
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(creepXp), [25, 40, 60, 85, 115, 150]);
});

test("heroXpForLevel reproduces NeedHeroXP's formula, including the published 200", () => {
  for (let level = 1; level <= 10; level++) {
    assert.equal(heroXpForLevel(level), needHeroXp(level), `hero level ${level}`);
  }
  assert.equal(heroXpForLevel(2), MISC_GAME.NeedHeroXP);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(heroXpForLevel), [0, 200, 500, 900, 1400, 2000]);
});

test("creepXpFactor is HeroFactorXP as a fraction, zero from level 5 on", () => {
  MISC_GAME.HeroFactorXP.forEach((percent, i) => {
    assert.equal(creepXpFactor(i + 1), percent / 100, `hero level ${i + 1}`);
  });
  assert.equal(creepXpFactor(6), 0);
  assert.equal(creepXpFactor(99), 0);
});
