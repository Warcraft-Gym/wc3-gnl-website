/**
 * Battle tags on the player pages: the old name links a tag answers, and the
 * "as TAG" note of a season.
 * Plain JavaScript so `node --test` runs the tests with no loader.
 */
import { slugify } from "./slug.mjs";

/**
 * The name part of a tag as a slug: "BeLit#11855" gives "belit".
 * @param {string | null | undefined} tag
 * @returns {string}
 */
export const tagSlug = (tag) => slugify((tag ?? "").split("#")[0]);

/**
 * How a roster row answers an old name link: by its name first, else by the
 * name part of its tag or of the tag it played that season as.
 * @param {{ name: string, battleTag?: string | null, played_as?: string | null }} row
 * @param {string} slug
 * @returns {"name" | "tag" | null}
 */
export function slugMatch(row, slug) {
  if (slugify(row.name) === slug) return "name";
  return [row.battleTag, row.played_as].some((tag) => tag && tagSlug(tag) === slug) ? "tag" : null;
}

/**
 * The tag a season row names beside the team: the season's tag when it is set
 * and differs from the person's current tag, else null.
 * @param {string | null | undefined} playedAs
 * @param {string | null | undefined} battleTag
 * @returns {string | null}
 */
export function playedAsNote(playedAs, battleTag) {
  const tag = playedAs?.trim();
  if (!tag) return null;
  return tag.toLowerCase() === (battleTag ?? "").trim().toLowerCase() ? null : tag;
}
