/**
 * Maps a `MapShop`'s unit rawcode to the Liquipedia icon that draws it on
 * the minimap — see `docs/creep-routes.md`'s "Map icons" section for where
 * every `/map-icons/*.png` file came from and the exact fetch recipe.
 * Plain JS so `node --test` can check it with no loader (see
 * `neutral-icons.test.mjs`); `neutral-icons.ts` re-exports this typed,
 * same split as `submission.mjs`/`submission.ts`.
 *
 * `MapShop.id` is built by `scripts/creep-maps/camps.mjs`'s `buildShops` as
 * `${typeId}-${index}`, so the rawcode is always the id's first four
 * characters (every WC3 rawcode is exactly four characters; see
 * `rawcodeFromShopId`).
 *
 * Names are Blizzard's own (`neutralunitstrings.txt`'s `Name=` field, the
 * same source `scripts/creep-maps/creep-table.mjs` uses for creeps) — not
 * transcribed from the wiki, which F001's own creep-table rebuild found
 * unreliable for two of five spot-checked entries.
 *
 * Not every neutral-passive unit on a map is a "shop": most are decorative
 * critters and huts (rats, sheep, gnoll huts…) with no matching Liquipedia
 * icon and nothing useful to draw. A rawcode absent from this map renders
 * no icon at all — `NeutralMarker` skips it — and the build script
 * (`scripts/creep-maps/build.mjs`) names every unresolved rawcode it saw
 * in its stdout summary, so a future catalogue that adds a new shop type
 * is never silently dropped without a trace.
 */
const MERCENARY_CAMP = { icon: "mercenary-camp", label: "Mercenary Camp" };

/** Rawcode -> `{ icon, label }`. `icon` is the file stem under
 * `/public/map-icons/<icon>.png`. */
export const NEUTRAL_ICONS = {
  ntav: { icon: "tavern", label: "Tavern" },
  ngme: { icon: "goblin-merchant", label: "Goblin Merchant" },
  ngad: { icon: "goblin-laboratory", label: "Goblin Laboratory" },
  nmrk: { icon: "marketplace", label: "Marketplace" },
  nfoh: { icon: "fountain-of-health", label: "Fountain of Health" },
  nmoo: { icon: "fountain-of-mana", label: "Fountain of Mana" },
  nshp: { icon: "goblin-shipyard", label: "Goblin Shipyard" },
  // Mercenary Camp: one rawcode per tileset variant (Blizzard reskins the
  // building per terrain, same unit). `nmr1` is not a real unit (absent
  // from `neutralunitstrings.txt`) and is deliberately not listed.
  nmer: MERCENARY_CAMP,
  nmr0: MERCENARY_CAMP,
  nmr2: MERCENARY_CAMP,
  nmr3: MERCENARY_CAMP,
  nmr4: MERCENARY_CAMP,
  nmr5: MERCENARY_CAMP,
  nmr6: MERCENARY_CAMP,
  nmr7: MERCENARY_CAMP,
  nmr8: MERCENARY_CAMP,
  nmr9: MERCENARY_CAMP,
  nmra: MERCENARY_CAMP,
  nmrb: MERCENARY_CAMP,
  nmrc: MERCENARY_CAMP,
  nmrd: MERCENARY_CAMP,
  nmre: MERCENARY_CAMP,
  nmrf: MERCENARY_CAMP,
};

/** Every WC3 rawcode is exactly four characters; `MapShop.id` is
 * `${rawcode}-${index}` (see the module doc comment above). */
export function rawcodeFromShopId(shopId) {
  return shopId.slice(0, 4);
}

/** The icon for a shop, or `null` when its rawcode has no Liquipedia icon
 * (a decorative critter/hut, not a real shop). */
export function neutralIconFor(shopId) {
  return NEUTRAL_ICONS[rawcodeFromShopId(shopId)] ?? null;
}
