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

/** Every item id in `itemdataIndex` (as returned by `slk.mjs`'s
 *  `indexByColumn(parseSlk(itemdataText), "itemID")`) whose `class`/`Level`
 *  match and `pickRandom === "1"` — i.e. the real in-game random pool for
 *  that class+level. `cls === "Any"` (the `"YYI<n>"` code) matches every
 *  class. Sorted for determinism. */
export function expandPool(itemdataIndex, cls, level) {
  const ids = [];
  for (const [id, rec] of itemdataIndex) {
    if (rec.pickRandom !== "1") continue;
    if (Number(rec.Level) !== level) continue;
    if (cls !== "Any" && rec.class !== cls) continue;
    ids.push(id);
  }
  return ids.sort();
}
