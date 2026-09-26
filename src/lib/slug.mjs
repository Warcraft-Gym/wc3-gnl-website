/**
 * URL slugs, and the player URL that carries the person's id.
 * Plain JavaScript so `node --test` runs the tests with no loader.
 */

/**
 * @param {string} input
 * @returns {string}
 */
export function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * `{id}-{name-slug}`; the id alone when the name slugs to nothing, the name alone when there is no id.
 * @param {number | null | undefined} id
 * @param {string} name
 * @returns {string}
 */
export const playerSlug = (id, name) => [id, slugify(name)].filter(Boolean).join("-");

/**
 * The player page of a person.
 * @param {number | null | undefined} id
 * @param {string} name
 * @returns {string}
 */
export const playerPath = (id, name) => `/gnl/players/${playerSlug(id, name)}`;

/**
 * Reads the player page param: leading digits followed by `-` or the end are the id,
 * anything else is a legacy name slug.
 * @param {string} param
 * @returns {{ id: number, slug?: undefined } | { id?: undefined, slug: string }}
 */
export function parsePlayerParam(param) {
  const m = /^(\d+)(?:-|$)/.exec(param);
  return m ? { id: Number(m[1]) } : { slug: param };
}
