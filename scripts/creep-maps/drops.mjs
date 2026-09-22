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
    const table = randomItemTables.find((t) => t.id === pointer);
    if (table) {
      for (const items of table.sets) sets.push({ items });
    }
  }
  return sets;
}

/** A camp's drops: the union of every creep unit's resolved drop sets,
 *  deduped by class+level (random pools) or by id (concrete items) — when
 *  the same pool/id shows up more than once (several creeps in the camp
 *  carry it), the highest chance seen wins. Sets with zero items (a real
 *  shape `war3mapUnits.doo` can carry — an empty roll) contribute nothing.
 *  `items` is left empty here; a build step fills it in once item data is
 *  available (see `build.mjs`). Sorted for a deterministic catalogue diff. */
export function campDrops(creepUnits, randomItemTables = []) {
  const byKey = new Map();
  for (const unit of creepUnits) {
    for (const set of setsForUnit(unit, randomItemTables)) {
      for (const { itemId, chance } of set.items) {
        const classified = classifyItemId(itemId);
        const key = dedupeKey(classified);
        const existing = byKey.get(key);
        if (!existing || chance > existing.chance) {
          byKey.set(key, { ...classified, chance, items: [] });
        }
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
 * The raw filter disagreed with Liquipedia's own published pools
 * (`evidence/liquipedia-pools.json`, harvested from six map previews via
 * `Template:Creep_map/Creep_spot`, `action=parse`) on 9 of 12 pools. A
 * column-by-column comparison proves this isn't fixable by tightening the
 * filter: in the "Charged Level 4" pool, Book of the Dead (`fgsk`:
 * class=Charged, Level=4, oldLevel=6, pickRandom=1, usable=1, uses=1) is a
 * genuine member, while Wand of the Wind (`wcyc`: class=Charged, Level=4,
 * oldLevel=6, pickRandom=1, usable=1, uses=3) is not — every column that
 * could plausibly gate membership (class, Level, oldLevel, pickRandom,
 * usable, sellable, ignoreCD, goldcost, prio) is either identical between
 * the two or doesn't separate them consistently across the other pools
 * (checked exhaustively; see this feature's handoff). And Ankh of
 * Reincarnation (`ankh`) is a genuine "Charged Level 4" member despite its
 * *own* `Level` column reading 5 — `Level` itself can't be the pool key.
 *
 * This isn't a stale-mirror problem either: the same mismatches reproduce
 * against `itemdata.slk` from a much newer w3x2lni mirror (`zhCN-1.32.8`,
 * patch 1.32.8) — the columns simply don't encode the random-item table
 * the live client actually rolls; that table is external to the
 * redistributed SLK. Liquipedia's own per-(class,level) table (the same
 * template render that produced the evidence file) is authoritative
 * instead. `POOL_OVERRIDES` is the exact, evidence-cited diff between the
 * raw SLK filter and that table for the 11 of 12 pools it was possible to
 * fully resolve.
 *
 * One pool couldn't be fully reproduced: Liquipedia's evidence lists a
 * `BTNRune` icon in "Power Up Level 1" alongside `BTNManual`/`BTNTome`, but
 * every `itemfunc.txt` entry using that icon (14 "Rune of ..." single-use
 * battle items, e.g. `rhe1` Rune of Lesser Healing) is
 * `pickRandom=0`/`class=PowerUp`/`Level=0` in *both* mirrors, and a live
 * re-render of the same template with no map context shows no rune at all
 * in the current Power Up Level 1 pool (just Manual of Health + the three
 * stat tomes) — there's no candidate item id to add. This gap is left
 * unresolved rather than guessed at; `item-pools.test.mjs` names it
 * explicitly instead of asserting a false equality. */
export const POOL_OVERRIDES = {
  "Charged|2": { add: ["crys"], remove: ["wlsd"] },
  "Charged|3": { remove: ["woms"] },
  "Charged|4": { add: ["ankh", "whwd"], remove: ["fgfh", "fgrd", "fgrg", "wcyc", "totw"] },
  "Charged|5": { add: ["fgbd", "iotw"], remove: ["ankh", "sres", "whwd"] },
  "Permanent|1": { add: ["rnsp"], remove: ["rag1"] },
  "Permanent|2": { remove: ["bspd", "cnob"] },
  "Permanent|3": { add: ["cnob"], remove: ["evtl", "rlif"] },
  "Permanent|4": { add: ["ram4"], remove: ["brac", "ciri", "lgdh", "lhst", "rwiz", "sbch"] },
  "Permanent|5": { remove: ["crys", "kpin", "mcou", "ward"] },
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
