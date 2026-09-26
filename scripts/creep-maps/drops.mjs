/** Resolves a camp's possible item drops from its creeps' inline drop
 * tables (`war3mapUnits.doo`'s `droppedItemSets`, see `units-doo.mjs`) and,
 * when a unit points at one instead, the map-level random item tables
 * (`war3map.w3i`, see `map-info.mjs`'s `parseW3i`).
 *
 * A dropped item's 4-char code is either a concrete item id (e.g. `"ckng"`
 * = Crown of Kings +5) or a random-pool pseudo-code: `"Y" + classLetter +
 * "I" + levelDigit` — `classFor` decodes the letter. Verified against
 * Liquipedia's own Autumn Leaves preview (`drops.test.mjs`'s cross-check)
 * and against every real drop code the nine bundle maps carry (all
 * `YiI1`-`YiI6`/`YjI1`-`YjI5`/`YkI1`-`YkI2` plus a handful of concrete ids —
 * none of the nine maps use the map-level table indirection, all
 * `itemTablePointer`s are `-1`, so that branch is exercised only by a
 * synthetic test here).
 */

/** The 2nd character of a random-pool code, decoded per the spec's fact
 *  sheet (cross-checked against `itemdata.slk`'s own `class` column
 *  values, which use the same names without the space in "Power Up"). */
export const CLASS_BY_LETTER = {
  i: "Permanent",
  j: "Charged",
  k: "PowerUp",
  l: "Artifact",
  m: "Purchasable",
  n: "Campaign",
  o: "Miscellaneous",
};

/** Decodes one 4-char dropped-item code: `{ kind: "class", class, level }`
 *  for a random-pool pseudo-code (`"YYI3"` = any class, level 3), or
 *  `{ kind: "item", id }` for anything else (a concrete item id). Never
 *  throws — an unrecognised code is just treated as a concrete id. */
export function classifyItemId(code) {
  if (typeof code === "string" && code.length === 4 && code[0] === "Y" && code[2] === "I" && /[0-9]/.test(code[3])) {
    const letter = code[1];
    const cls = letter === "Y" ? "Any" : CLASS_BY_LETTER[letter];
    if (cls) {
      return { kind: "class", class: cls, level: Number(code[3]) };
    }
  }
  return { kind: "item", id: code };
}

function dedupeKey(classified) {
  return classified.kind === "class" ? `class:${classified.class}:${classified.level}` : `item:${classified.id}`;
}

/** Every `{chance, itemId}` a unit's death can roll: its own
 *  `droppedItemSets`, plus (when `itemTablePointer !== -1`) the matching
 *  map-level table's sets from `randomItemTables` (same `{items}` shape —
 *  see `map-info.mjs`'s `parseW3i`). `randomItemTables` entries are matched
 *  by their own `id` field (the table's in-file number), not array index. */
function setsForUnit(unit, randomItemTables) {
  const sets = [...(unit.droppedItemSets ?? [])];
  const pointer = unit.itemTablePointer;
  if (pointer !== undefined && pointer !== null && pointer !== -1) {
    // `null` means `map-info.mjs` could not read this file's `war3map.w3i`
    // tail (an unrecognised format version). Empty is fine — the map has no
    // tables — but *unknown* plus a unit that points into them would mean
    // silently dropping real loot, so refuse instead.
    if (randomItemTables === null) {
      throw new Error(
        `unit ${unit.typeId} points at random item table ${pointer}, but war3map.w3i's ` +
          "table section could not be parsed for this map's format version",
      );
    }
    const table = randomItemTables.find((t) => t.id === pointer);
    if (table) {
      for (const items of table.sets) sets.push({ items });
    }
  }
  return sets;
}

/** Every drop *slot* one creep unit carries, in file order:
 *  `[{ kind, class, level, chance }]` for random pools, `{ kind: "item", id,
 *  chance }` for a concrete item. One entry per item in per set — a unit
 *  that rolls two Power Up 1s yields two entries, because the camp really
 *  does drop two items.
 *
 *  The catalogue keeps this per-creep view (`camps[].creeps[].drops`):
 *  "which of these five creeps is the one holding the permanent" is the
 *  question a route author actually asks. */
export function unitDrops(unit, randomItemTables = []) {
  const drops = [];
  for (const set of setsForUnit(unit, randomItemTables)) {
    for (const { itemId, chance } of set.items) {
      drops.push({ ...classifyItemId(itemId), chance });
    }
  }
  return drops;
}

/** A camp's drops: every creep unit's slots grouped by class+level (random
 *  pools) or by id (concrete items). `count` is how many slots the camp has
 *  of that pool — two creeps each carrying Power Up 1 means `count: 2` and
 *  two items on the ground, which the old shape (a plain deduped union)
 *  could not express. `chance` is the highest seen for the group. Sets with
 *  zero items (a real shape `war3mapUnits.doo` can carry — an empty roll)
 *  contribute nothing. `items` is left empty here; a build step fills it in
 *  once item data is available (see `build.mjs`). Sorted for a
 *  deterministic catalogue diff. */
export function campDrops(creepUnits, randomItemTables = []) {
  const byKey = new Map();
  for (const unit of creepUnits) {
    for (const { chance, ...classified } of unitDrops(unit, randomItemTables)) {
      const key = dedupeKey(classified);
      const existing = byKey.get(key);
      if (existing) {
        existing.count += 1;
        existing.chance = Math.max(existing.chance, chance);
      } else {
        byKey.set(key, { ...classified, chance, count: 1, items: [] });
      }
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "class" ? -1 : 1;
    const aKey = a.kind === "class" ? `${a.class}:${a.level}` : a.id;
    const bKey = b.kind === "class" ? `${b.class}:${b.level}` : b.id;
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
}

/** F011-followup-1: documented corrections layered on top of the raw
 *  `pickRandom=1 AND class AND Level` filter below.
 *
 * F011-followup-1's first evidence file (`evidence/liquipedia-pools.json`)
 * turned out to be harvested with a flawed regex: it capped each pool's
 * segment at a fixed length and, for the longer pools, ran past the end of
 * the Items block into the *next* camp's creep icons — so it both truncated
 * some pools (Permanent Level 4 down to 4 items instead of 9) and
 * contaminated others (a stray `BTNRune` credited to "Power Up Level 1").
 * F011-followup-1 faithfully implemented that flawed file, which cost real
 * pool members (Wand of Mana Stealing dropped from Charged 3; Ring of
 * Skull and Talisman of Evasion dropped from Permanent 3; five items
 * dropped from Permanent 4).
 *
 * This feature (F011-followup-2) replaces it with
 * `evidence/liquipedia-pools-corrected.json`: the same six map previews,
 * but each pool's segment is cut at the next pool label *or* the next
 * `Creep Spot` block, and the list kept is the *modal* list across all
 * occurrences (`confidence` in the JSON records how often, e.g. "Permanent
 * Level 1": 20/20 identical, "Permanent Level 3": 17/20). Spot-checked
 * directly against a fresh, no-map-context render of
 * `Template:Creep_map/Creep_spot` for "Charged Level 4" (`item1=Charged,
 * itemlevel1=4`), which reproduces the corrected file's 6-item list
 * (Ankh of Reincarnation, Book of the Dead, Healing Wards, Health Stone,
 * Mana Stone, Wand of the Wind) exactly — see this feature's handoff for
 * the raw API response.
 *
 * A column-by-column comparison of `itemdata.slk` (all 35 columns) proves
 * the raw filter can't be tightened into the real rule: in the "Charged
 * Level 4" pool, Book of the Dead (`fgsk`: class=Charged, Level=4,
 * oldLevel=6, pickRandom=1, usable=1, uses=1) is a genuine member, while
 * Red Drake Egg (`fgrd`: class=Charged, Level=4, oldLevel=6, pickRandom=1,
 * usable=1, uses=1) is not — no column separates them consistently across
 * the other pools either (see F011-followup-1's handoff for the exhaustive
 * check). And Ankh of Reincarnation (`ankh`) is a genuine "Charged Level 4"
 * member despite its *own* `Level` column reading 5 (it's the raw "Charged
 * Level 5" filter that picks it up) — `Level` itself can't be the pool key,
 * confirming items really do move between the SLK's own level and the live
 * table's pool one level over.
 *
 * `POOL_OVERRIDES` is the minimal, evidence-cited add/remove diff against
 * the corrected table needed to reach 12/12 exact — re-derived from
 * scratch against the corrected file (not carried over from
 * F011-followup-1's table, which was fit to the flawed one and, on
 * several pools, removed items that the raw filter already had right).
 * The pattern: several items sit one pool level off in the raw SLK
 * relative to the live table — an item's own SLK `Level` slides down by
 * one class-holding level, but only for a handful of ids:
 *   - Ankh of Reincarnation (`ankh`) and Healing Wards (`whwd`): raw SLK
 *     Level 5, live pool Charged Level 4 (Charged Level 5, observed 4/4).
 *   - Spiked Collar/"Fel Hound" icon (`fgfh`) and Stone Token/"Rock Golem"
 *     icon (`fgrg`): raw SLK Level 4, live pool Charged Level 5, observed
 *     2/3 and 4/4 respectively.
 *   - Crystal Ball (`crys`): raw SLK Permanent Level 5, live pool Charged
 *     Level 2, observed 5/5.
 *   - Legion Doom-Horn/"Horn of Doom" icon (`lgdh`): raw SLK Permanent
 *     Level 4, live pool Permanent Level 5, observed 9/10.
 *   - Circlet of Nobility (`cnob`): raw SLK Permanent Level 2, live pool
 *     Permanent Level 3, observed 17/20.
 *   - Boots of Speed (`bspd`) and Wand of Lightning Shield/"Star Wand" icon
 *     (`wlsd`): raw SLK members of their own class+level that the live
 *     table simply doesn't carry (24/24 and 5/5 respectively) — no
 *     replacement pool identified, dropped outright, same treatment as
 *     Red Drake Egg (`fgrd`, "Red Dragon" icon) and Talisman of the Wild
 *     (`totw`, "Stone" icon), which the raw Charged Level 4 filter also
 *     includes but neither corrected pool lists at all (2/3 and 4/4).
 *   - Ring of Protection +4 (`rde3`, "Ring Green" icon): raw SLK
 *     Permanent Level 6, live table doesn't carry it there (8/8) — same
 *     "no replacement" case.
 *   - Tome of Experience (`texp`, "Tome Brown" icon): raw SLK Power Up
 *     Level 2, live table doesn't carry it there (29/30).
 * Ring of Superiority (`rnsp`) and Ring of the Archmagi tier 4 (`ram4`)
 * are added the same way F011-followup-1 found them (see
 * `EXTRA_ITEM_INFO` below) — both genuinely belong per the corrected file
 * too (Permanent Level 1 observed 20/20, Permanent Level 4 observed
 * 17/17).
 *
 * Power Up Level 1's earlier "unresolvable `BTNRune`" gap is gone: the
 * corrected file's Power Up Level 1 is just Manual of Health + the three
 * stat tomes (observed 47/50) — exactly what the raw filter already
 * produces with **no** override. The `BTNRune` credit was the flawed
 * file's own contamination bleeding in from the next camp's creep icons,
 * not a real pool member. */
export const POOL_OVERRIDES = {
  "Charged|2": { add: ["crys"], remove: ["wlsd"] },
  "Charged|4": { add: ["ankh", "whwd"], remove: ["fgfh", "fgrd", "fgrg", "totw"] },
  "Charged|5": { add: ["fgbd", "iotw", "fgfh", "fgrg"], remove: ["ankh", "whwd"] },
  "Permanent|1": { add: ["rnsp"] },
  "Permanent|2": { remove: ["bspd", "cnob"] },
  "Permanent|3": { add: ["cnob"] },
  "Permanent|4": { add: ["ram4"], remove: ["lgdh"] },
  "Permanent|5": { add: ["lgdh"], remove: ["crys"] },
  "Permanent|6": { remove: ["rde3"] },
  "PowerUp|2": { remove: ["texp"] },
};

/** Full `{ name, icon, class, level }` for the four ids `POOL_OVERRIDES`
 *  adds that patch 1.27.1's `itemstrings.txt`/`itemfunc.txt` can't resolve
 *  at all (`item-table.mjs`'s `buildItemsTable` uses this instead of
 *  throwing "missing" for these four):
 *
 * - `rnsp` (Ring of Superiority) and `ram4` (Ring of the Archmagi, tier 4)
 *   *do* have a real English name in 1.27.1's own `itemstrings.txt`, and a
 *   real `itemfunc.txt` icon — but both are `class=Miscellaneous`,
 *   `pickRandom=0` quest-shop items there (unrollable), and their icon has
 *   since been renamed (`BTNGoldRing` -> `BTNRingGold`, `BTNRingJadeFalcon`
 *   -> `BTNRingOfTheArchmagi`) to match Liquipedia's current icon, so
 *   deriving from the source files would produce a wrong class/level/icon
 *   even though the id and name are right.
 * - `fgbd` (Blue Drake Egg) and `iotw` (Idol of the Wild) don't exist under
 *   any name in 1.27.1's data at all — they were added later. Their id and
 *   `class`/`Level` come from the newer `zhCN-1.32.8` w3x2lni mirror's own
 *   `itemdata.slk` (which has no English strings file, hence no `name`
 *   source there); `name`/`icon` come from a live re-render of Liquipedia's
 *   `Template:Creep_map/Creep_spot` for Charged Level 5, which pairs each
 *   icon with its item's display name. */
export const EXTRA_ITEM_INFO = {
  rnsp: { name: "Ring of Superiority", icon: "BTNRingGold", class: "Permanent", level: 1 },
  ram4: { name: "Ring of the Archmagi", icon: "BTNRingOfTheArchmagi", class: "Permanent", level: 4 },
  fgbd: { name: "Blue Drake Egg", icon: "BTNAzureDragon", class: "Charged", level: 5 },
  iotw: { name: "Idol of the Wild", icon: "BTNFurbolgTracker", class: "Charged", level: 5 },
};

/** Every item id in `itemdataIndex` (as returned by `slk.mjs`'s
 *  `indexByColumn(parseSlk(itemdataText), "itemID")`) whose `class`/`Level`
 *  match and `pickRandom === "1"` — i.e. the raw in-game random pool for
 *  that class+level per the SLK — corrected by `POOL_OVERRIDES` (see above)
 *  for the class+level combinations Liquipedia's own table disagrees with.
 *  `cls === "Any"` (the `"YYI<n>"` code) matches every class; `Any` pools
 *  carry no override (outside the evidence set). Sorted for determinism. */
export function expandPool(itemdataIndex, cls, level) {
  const ids = new Set();
  for (const [id, rec] of itemdataIndex) {
    if (rec.pickRandom !== "1") continue;
    if (Number(rec.Level) !== level) continue;
    if (cls !== "Any" && rec.class !== cls) continue;
    ids.add(id);
  }
  const override = POOL_OVERRIDES[`${cls}|${level}`];
  if (override) {
    for (const id of override.remove ?? []) ids.delete(id);
    for (const id of override.add ?? []) ids.add(id);
  }
  return [...ids].sort();
}
