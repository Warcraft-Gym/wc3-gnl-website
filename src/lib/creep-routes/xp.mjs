/** Creep and hero experience, sourced from
 * https://warcraft.wiki.gg/wiki/Hero_(Warcraft_III)#Experience — a hero
 * killing a creep camp gains XP per creep, tapered by how far the hero has
 * already levelled past the creeps guarding it.
 */

const CREEP_XP_BASE = [25, 40, 60, 85, 115, 150];

/** XP a hero gets for killing one creep of `level` (levels 1-6 from the
 * sourced table, 7+ by the wiki's stated recurrence: previous + 5*(level+1)). */
export function creepXp(level) {
  if (level < 1) throw new Error(`creepXp: level must be >= 1, got ${level}`);
  if (level <= CREEP_XP_BASE.length) return CREEP_XP_BASE[level - 1];
  let xp = CREEP_XP_BASE[CREEP_XP_BASE.length - 1];
  for (let l = CREEP_XP_BASE.length + 1; l <= level; l++) {
    xp += 5 * (l + 1);
  }
  return xp;
}

/** Cumulative XP a hero needs to *be* `level` (level 1 needs 0; each step
 * from n-1 to n costs 100*n more, per the sourced table through level 6). */
export function heroXpForLevel(level) {
  if (level < 1) throw new Error(`heroXpForLevel: level must be >= 1, got ${level}`);
  let xp = 0;
  for (let l = 2; l <= level; l++) {
    xp += 100 * l;
  }
  return xp;
}

/** The share of a creep's XP a hero still gets at `heroLevel`: full value
 * only applies to level 0 (unused here); by level 1 a hero already only
 * keeps 0.8 of it, tapering to 0 from level 5 on. */
export function creepXpFactor(heroLevel) {
  const factors = { 1: 0.8, 2: 0.7, 3: 0.6, 4: 0.5 };
  return factors[heroLevel] ?? 0;
}

function levelForXp(xp) {
  let level = 1;
  while (heroXpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

/** Folds a hero through `camps` (each an array of creep levels, in camp
 * order) starting at `startLevel`, applying `creepXpFactor` to every kill
 * at the hero's *current* level — Blizzard's reduction factor applies per
 * kill, not once per camp (`MiscGame.txt`'s `HeroFactorXP` is read at the
 * moment of each kill; see docs/creep-routes.md's "XP model") — so the
 * hero can level up mid-camp and the rest of that camp's kills already pay
 * the new, lower factor.
 *
 * Returns `{ level, xp }` after each camp (`perCamp`) and overall.
 */
export function heroLevelAfter(camps, startLevel = 1) {
  let level = startLevel;
  let xp = heroXpForLevel(startLevel);
  const perCamp = [];

  for (const camp of camps) {
    for (const creepLevel of camp) {
      const factor = creepXpFactor(level);
      // Warcraft III awards whole XP: floor each creep's grant (not the
      // running total) — our modelling choice, see docs/creep-routes.md.
      xp += Math.floor(creepXp(creepLevel) * factor);
      level = levelForXp(xp);
    }
    perCamp.push({ level, xp });
  }

  return { level, xp, perCamp };
}
