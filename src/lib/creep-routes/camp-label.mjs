/**
 * Human-readable camp labels for reader-facing UI — a camp id like "c09"
 * means nothing to a coach reading a route; these read the actual creeps.
 * See DESIGN.md §Creep routes' "Table anatomy" and docs/creep-routes.md's
 * "Camp label rule". Camp ids stay in `data-camp` and `aria-label`s (those
 * are tooling, not reader-facing text) — only visible copy goes through
 * these helpers.
 */

/** "<highest-level creep's name>" + " +N" when the camp has more creeps
 *  than that one, e.g. a 3-creep camp reads "Giant Skeleton Warrior +2".
 *  A level tie keeps the first creep in `camp.creeps`' own order (the
 *  data's own placement order — the array is never re-sorted for display),
 *  not alphabetical. `+N` counts *bodies* past the first, so three copies
 *  of the same creep still read "+2". */
export function campLabel(camp) {
  const creeps = camp?.creeps ?? [];
  if (!creeps.length) return camp?.id ?? "Camp";
  const highest = creeps.reduce((best, c) => (c.level > best.level ? c : best), creeps[0]);
  const total = creeps.reduce((sum, c) => sum + c.count, 0);
  const extra = total - 1;
  return extra > 0 ? `${highest.name} +${extra}` : highest.name;
}

/** "1× Giant Skeleton Warrior · 1× Sludge Flinger · 1× Skeleton Archer" —
 *  every creep in the camp, in the data's own order, count×name. Empty
 *  string for a camp with no creeps (never happens for a real catalogue
 *  camp, but this never throws). */
export function campComposition(camp) {
  const creeps = camp?.creeps ?? [];
  return creeps.map((c) => `${c.count}× ${c.name}`).join(" · ");
}

/** A condition already reads as a trigger to a human — "if harassed",
 *  "Skip if the Undead scouted this side" — so the step table's condition
 *  chip must never prefix a second "if" onto text that already starts with
 *  one (F009-followup-1: the chip read "if Skip if the Undead scouted this
 *  side"). Renders the author's text exactly as written; only prepends
 *  "If " when it doesn't already open with a recognised trigger word
 *  (if/when/unless/skip/only/after/before, case-insensitive) — so
 *  "harassed" still reads as a condition ("If harassed") while an
 *  author-written trigger is left untouched. */
const CONDITION_PREFIX_RE = /^(if|when|unless|skip|only|after|before)\b/i;

export function conditionLabel(text) {
  const value = text ?? "";
  if (!value) return value;
  return CONDITION_PREFIX_RE.test(value) ? value : `If ${value}`;
}

/** Band word for the camp card's title (F012), mirroring `BAND_LABEL` in
 *  `RouteBadges.tsx` — duplicated here rather than imported, so this stays
 *  a plain, bundler-free `.mjs` module `node --test` can load directly
 *  with no loader; the same three words already exist twice for the same
 *  reason (`BAND_MAX_LEVEL` in `scripts/creep-maps/camps.mjs` and
 *  `BAND_LABEL` in `RouteBadges.tsx`). */
const CARD_BAND_WORD = { easy: "Easy", medium: "Medium", hard: "Hard" };

/** "Medium Creep Spot [16]" — the camp card's title (F012), mirroring
 *  Liquipedia's own preview-box heading: the band word (capitalised) +
 *  "Creep Spot" + the camp's summed level in brackets. An unknown/missing
 *  band reads "Creep Spot [N]" alone rather than inventing a band word. */
export function campSpotTitle(camp) {
  const word = CARD_BAND_WORD[camp?.band];
  const level = camp?.level ?? 0;
  return `${word ? `${word} ` : ""}Creep Spot [${level}]`;
}

/** Reader-facing spacing for a random-pool drop's `class` (F011's
 *  `classifyItemId` in `scripts/creep-maps/drops.mjs` keeps
 *  `CLASS_BY_LETTER`'s names as-is, e.g. "PowerUp" with no space) —
 *  matches Liquipedia's own "Power Up" wording. */
const DROP_CLASS_DISPLAY = {
  Permanent: "Permanent",
  Charged: "Charged",
  PowerUp: "Power Up",
  Artifact: "Artifact",
  Purchasable: "Purchasable",
  Campaign: "Campaign",
  Miscellaneous: "Miscellaneous",
  Any: "Any",
};

/** "Level 3, Permanent" for a random-pool drop set (`kind: "class"`), or
 *  the concrete item's own name for a single fixed drop (`kind: "item"`,
 *  e.g. "Crown of Kings +5") — the camp card's Items section row label
 *  (F012), mirroring Liquipedia's own wording. Falls back to "Item" for a
 *  concrete drop whose `items[]` failed to resolve (an empty `items[]` is
 *  a real, if rare, catalogue shape — see `MapCampDrop`'s doc comment). */
export function dropSetLabel(drop) {
  if (!drop) return "";
  if (drop.kind === "class") {
    return `Level ${drop.level}, ${DROP_CLASS_DISPLAY[drop.class] ?? drop.class}`;
  }
  return drop.items?.[0]?.name ?? "Item";
}
