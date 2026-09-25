/** Intrinsic pixel size of a Sanity image, read from its asset reference.
 *
 * Sanity encodes the dimensions in the id — `image-<hash>-256x256-png` — so a
 * renderer can know how big a picture really is without fetching it or
 * querying `asset->metadata`.
 *
 * Why it matters: the Portable Text renderer drew every image at `w-full`,
 * which is right for a screenshot and absurd for a 64-pixel item icon. The
 * guide on item drops has 64 of those, each blown up to the width of the
 * column and requested from Sanity at 1400px — an upscale of a source that
 * never had the detail.
 *
 * Returns `null` for anything that is not a recognisable asset id, and the
 * caller falls back to its previous behaviour rather than guessing.
 */
const ASSET_ID = /-(\d+)x(\d+)-[a-z0-9]+$/i;

export function imageDimensions(value) {
  const ref = value?.asset?._ref ?? value?.asset?._id;
  if (typeof ref !== "string") return null;
  const m = ref.match(ASSET_ID);
  if (!m) return null;
  const width = Number(m[1]);
  const height = Number(m[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null;
  return { width, height };
}

/** Anything at or below this is drawn at its own size: it is an icon, a rune,
 *  a unit portrait — a thing whose meaning is its shape, not its detail.
 *  Above it, an image is content and fills the column as before. */
export const ICON_MAX_WIDTH = 320;

/** How wide to *render* an image: never wider than the source, so nothing is
 *  upscaled, and never wider than the column. */
export function renderWidth(dimensions, columnWidth = 1400) {
  if (!dimensions) return columnWidth;
  return Math.min(dimensions.width, columnWidth);
}
