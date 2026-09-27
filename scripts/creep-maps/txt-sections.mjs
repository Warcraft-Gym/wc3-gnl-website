/** Parses Blizzard's `[rawcode]\nKey=Value\n...` "func"/"strings" text files
 * (`neutralunitfunc.txt`, `neutralunitstrings.txt`, `itemfunc.txt`,
 * `itemstrings.txt`, ...): every file in this family shares the same
 * section-per-rawcode shape, only the field name differs (`Name=` for a
 * strings file, `Art=` for a func file) — one parser, reused by
 * `creep-table.mjs` (F001-followup-2) and `item-table.mjs` (F011).
 */

/** Returns `Map<rawcode, value>`, one entry per `[rawcode]` section that has
 *  a `<field>=` line. A section without that field is simply absent from
 *  the map (never a guessed/empty value). */
export function parseIniField(text, field) {
  const prefix = `${field}=`;
  const map = new Map();
  let section = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }
    if (section && trimmed.startsWith(prefix)) {
      map.set(section, trimmed.slice(prefix.length));
    }
  }
  return map;
}

/** `Art=ReplaceableTextures\CommandButtons\BTNHelmutPurple.blp` ->
 *  `"BTNHelmutPurple"` — the basename without its extension, which is both
 *  the icon file's key on disk (`public/wc3-icons/**\/<key>.png`) and the
 *  suffix Liquipedia's own file naming uses (`File:Wc3<key>.png`). */
/** Art paths whose casing in Blizzard's own data does not match the icon
 *  file everyone else uses. `BTNICeTroll` (capital C, lower e) is what
 *  `neutralunitfunc.txt` gives for the Ice Troll Trapper and Warlord; the
 *  icon is `BTNIceTroll`, the same file the plain Ice Troll points at.
 *  Worth correcting rather than fetching twice: a case-only difference
 *  resolves fine on a case-insensitive filesystem like macOS and 404s on
 *  Linux, so it survives local testing and breaks in production. */
const ICON_KEY_FIXES = {
  BTNICeTroll: "BTNIceTroll",
  // Blizzard writes "Flesheater", the icon everyone else has is
  // "FleshEater". Recorded as unavailable for months because the fetch asks
  // Liquipedia for the key verbatim and got a miss.
  BTNMurlocFlesheater: "BTNMurlocFleshEater",
};

export function iconKeyFromArt(artValue) {
  const base = artValue.split(/[\\/]/).pop() ?? artValue;
  const key = base.replace(/\.[a-zA-Z0-9]+$/, "");
  return ICON_KEY_FIXES[key] ?? key;
}
