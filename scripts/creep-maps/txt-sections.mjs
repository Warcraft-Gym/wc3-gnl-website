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
export function iconKeyFromArt(artValue) {
  const base = artValue.split(/[\\/]/).pop() ?? artValue;
  return base.replace(/\.[a-zA-Z0-9]+$/, "");
}
