/** The game patches an author can tag a build order or creep route with.
 *
 * This was a free-text box, and the result argues the case on its own: of 37
 * published build orders two had filled it in, as `"2.0.3"` and `"> 2.0.0"` —
 * two formats, one of them not a version at all. A build order is only
 * meaningful against a balance patch, so the value has to be one the site can
 * group and filter by later.
 *
 * Newest first. The first entry is the current patch by construction, so a new
 * release is one line at the top rather than a constant to remember.
 *
 * The set comes from W3Champions' own stats, which are keyed by the patches
 * that actually had ladder games (`/api/w3c-stats/map-race-wins`), collapsed to
 * the major.minor.patch players say out loud. W3Champions writes full build
 * strings — `3.0.0.24268`, `2.0.4.23452` — and `normalizePatch` folds those in.
 */

/** @typedef {{ value: string, note?: string }} Patch */

/** @type {Patch[]} */
export const PATCHES = [
  { value: "3.0", note: "Forsaken Kingdom" },
  { value: "2.0.4" },
  { value: "2.0.3" },
  { value: "2.0.2" },
  { value: "2.0", note: "Reforged 2.0" },
  { value: "1.36" },
  { value: "1.35" },
  { value: "1.32" },
];

export const PATCH_VALUES = PATCHES.map((p) => p.value);

/** The newest patch we know about — the one most submissions are written for. */
export const CURRENT_PATCH = PATCHES[0].value;

/** What the option reads as. The current patch says so, rather than the list
 *  carrying a hand-maintained "(current)" that rots at the next release. */
export function patchLabel(patch) {
  const named = patch.note ? `${patch.value} — ${patch.note}` : patch.value;
  return patch.value === CURRENT_PATCH ? `${named} (current)` : named;
}

/** Best-effort map of whatever is already stored onto one of `PATCH_VALUES`.
 *
 * Existing documents, W3Champions payloads and people typing into the old free
 * text box all disagree about format, and this runs when a form is prefilled
 * from a published document — so returning null quietly loses an author's
 * answer. It takes the leading version number and drops trailing segments until
 * something matches: `3.0.0.24268` → `3.0`, `> 2.0.0` → `2.0`, `v1.36.2` → `1.36`.
 *
 * Returns null when there is no version in there at all. */
export function normalizePatch(raw) {
  if (typeof raw !== "string") return null;
  const match = raw.match(/\d+(?:\.\d+)*/);
  if (!match) return null;

  let candidate = match[0];
  while (candidate) {
    if (PATCH_VALUES.includes(candidate)) return candidate;
    const cut = candidate.lastIndexOf(".");
    if (cut === -1) return null;
    candidate = candidate.slice(0, cut);
  }
  return null;
}

/** True when `value` is empty (the field is optional) or a known patch. */
export function isKnownPatch(value) {
  return !value || PATCH_VALUES.includes(value);
}

/** The same list in the shape Sanity Studio wants for a dropdown. */
export const PATCH_OPTIONS = PATCHES.map((p) => ({ title: patchLabel(p), value: p.value }));
