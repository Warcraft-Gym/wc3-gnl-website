/**
 * A stop picture's URLs through the Sanity image pipeline (`@sanity/image-url`): a thumbnail
 * cropped to 4:3 at 1x and 2x for the strip (200×150 on desktop, 160×120 on a phone), and the
 * lightbox at 800, 1200 and 1600 wide, every one in the browser's best format. The project and
 * dataset come from the URL itself, so a staging picture stays on staging. A URL that is not on
 * Sanity's CDN (a fixture file) is served as is, with no `srcset`. Plain JS so `node --test` runs
 * `stop-image-url.test.mjs`.
 */
import { createImageUrlBuilder } from "@sanity/image-url";

const CDN = /^https:\/\/cdn\.sanity\.io\/images\/([^/]+)\/([^/]+)\//;

/** The thumbnail sizes in CSS px: [width, height], desktop first. */
export const THUMB = { desktop: [200, 150], phone: [160, 120] };
/** The thumbnail's `sizes`: 200px from the `sm` breakpoint, 160px under it. */
export const THUMB_SIZES = "(min-width: 640px) 200px, 160px";
/** The lightbox picture's widths and `sizes`. */
export const LIGHTBOX_WIDTHS = [800, 1200, 1600];
export const LIGHTBOX_SIZES = "92vw";

/** The picture `w` wide, cropped to `h` tall when given, auto format; a plain URL as is. */
export function stopImageUrl(url, w, h) {
  const m = CDN.exec(url);
  if (!m) return url;
  const img = createImageUrlBuilder({ projectId: m[1], dataset: m[2] }).image(url).width(w).auto("format");
  return (h ? img.height(h).fit("crop") : img).url();
}

/** The thumbnail's `src` and `srcset` (both sizes at 1x and 2x); no `srcset` for a plain URL. */
export function thumbSources(url) {
  const [w, h] = THUMB.desktop;
  if (!CDN.test(url)) return { src: url };
  const set = [THUMB.phone, THUMB.desktop].flatMap(([tw, th]) => [1, 2].map((k) => [tw * k, th * k])).sort((a, b) => a[0] - b[0]);
  return { src: stopImageUrl(url, w, h), srcSet: set.map(([sw, sh]) => `${stopImageUrl(url, sw, sh)} ${sw}w`).join(", "), sizes: THUMB_SIZES };
}

/** The lightbox picture's `src` and `srcset` at 800, 1200 and 1600 wide; no `srcset` for a plain URL. */
export function lightboxSources(url) {
  if (!CDN.test(url)) return { src: url };
  const top = LIGHTBOX_WIDTHS.at(-1);
  return { src: stopImageUrl(url, top), srcSet: LIGHTBOX_WIDTHS.map((w) => `${stopImageUrl(url, w)} ${w}w`).join(", "), sizes: LIGHTBOX_SIZES };
}
