/** Groups "icon, then its name" pairs in migrated article bodies into a grid.
 *
 * WordPress articles that catalogue things — the item-drops guide is 60 item
 * icons — came across as an alternating run of blocks:
 *
 *     image 64x64 · paragraph "Slippers of Agility +3" · image 64x64 · …
 *
 * Portable Text renders one block per line, so that reads as sixty rows of a
 * tiny picture above a few words, filling the page with what is really a
 * table. This finds those runs and replaces them with a single `iconGrid`
 * block the renderer lays out in columns.
 *
 * Deliberately conservative — it is rewriting someone's article, so it only
 * groups what is unmistakably a catalogue:
 *
 *   - the image must be icon-sized (`ICON_MAX_WIDTH`), so a screenshot with a
 *     caption underneath is never swept up;
 *   - the following block must be a plain paragraph short enough to be a name
 *     rather than prose;
 *   - a run of one is left alone. A single icon with a line under it is a
 *     figure, not a table.
 */
import { ICON_MAX_WIDTH, imageDimensions } from "./sanity-image-size.mjs";

/** Punctuation that only meant something while the labels were a run-on prose
 *  list: the separator, and the conjunction before the final entry. A bare
 *  trailing "and" is left alone — only one joined to a comma is unambiguous. */
const TRAILING_SEPARATOR = /(?:,\s*(?:and|or))?\s*[,;.]?$/i;

/** Longest a block can be and still read as a label. The item guide's longest
 *  is 80 — "Wand of Lightning Shield (removed from droptable by blizzard in
 *  1.36 patch)" — so the bound has to clear that; a grid cell wraps it fine.
 *  What actually keeps prose out is the icon-sized image and the run of two. */
export const MAX_LABEL_LENGTH = 100;

/** Fewest pairs worth turning into a grid. */
export const MIN_GRID_ITEMS = 2;

function plainText(block) {
  if (!block || block._type !== "block") return null;
  if (block.style && block.style !== "normal") return null;
  const children = Array.isArray(block.children) ? block.children : [];
  if (children.some((c) => c?._type && c._type !== "span")) return null;
  const text = children.map((c) => (typeof c?.text === "string" ? c.text : "")).join("").trim();
  return text.replace(TRAILING_SEPARATOR, "").trim();
}

function isIcon(block) {
  if (!block || block._type !== "image" || !block.asset) return false;
  const d = imageDimensions(block);
  return d !== null && d.width <= ICON_MAX_WIDTH;
}

/** `blocks` in, `blocks` out — with runs of icon+label replaced by one
 *  `{ _type: "iconGrid", items: [{ image, label }] }`. */
export function groupIconLabelPairs(blocks) {
  if (!Array.isArray(blocks)) return blocks;
  const out = [];
  let i = 0;

  while (i < blocks.length) {
    const pairs = [];
    let j = i;
    while (j + 1 < blocks.length && isIcon(blocks[j])) {
      const label = plainText(blocks[j + 1]);
      if (label === null || label.length === 0 || label.length > MAX_LABEL_LENGTH) break;
      pairs.push({ image: blocks[j], label });
      j += 2;
    }

    if (pairs.length >= MIN_GRID_ITEMS) {
      out.push({
        _type: "iconGrid",
        _key: `icongrid-${blocks[i]?._key ?? i}`,
        items: pairs.map((p, n) => ({ ...p, _key: p.image?._key ?? `icon-${i}-${n}` })),
      });
      i = j;
    } else {
      out.push(blocks[i]);
      i += 1;
    }
  }

  return out;
}
