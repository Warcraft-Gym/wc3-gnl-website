/** Map name → catalogue slug: lowercase, hyphens, no version.
 *
 * "Autumn Leaves v2" → "autumn-leaves", "Turtle Rock v2" → "turtle-rock".
 * The version lives in `mapVersion` instead, so a route survives a map
 * revision bump.
 */
export function slugify(name) {
  return name
    .replace(/\bv\d+(\.\d+)?\b/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
