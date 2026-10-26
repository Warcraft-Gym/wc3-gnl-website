/**
 * The `next/image` loader for pictures on Sanity's CDN: Sanity's own image
 * pipeline resizes them, so they never pass through `/_next/image`, which is a
 * billed Vercel request and image transformation each. The URL keeps what the
 * caller asked for (a crop, a height, a format) and takes the width `next/image`
 * asks for, never more than the caller's own width, with the height scaled to
 * match. A URL with no width is capped by `fit=max`, so nothing is upscaled.
 * Plain JS so `node --test` runs `sanity-image-loader.test.mjs`.
 */

const CDN = /^https:\/\/cdn\.sanity\.io\/images\//;

/** Whether `src` is a picture on Sanity's CDN. */
export function isSanityImage(src) {
  return typeof src === "string" && CDN.test(src);
}

/**
 * The `loader` prop of `next/image` for a Sanity picture.
 * @param {{ src: string, width: number, quality?: number }} props
 */
export function sanityImageLoader({ src, width, quality }) {
  const url = new URL(src);
  const p = url.searchParams;
  const asked = Number(p.get("w")) || 0;
  const w = asked ? Math.min(width, asked) : width;
  const h = Number(p.get("h")) || 0;
  if (asked && h) p.set("h", String(Math.round((h * w) / asked)));
  p.set("w", String(w));
  if (!p.has("fit")) p.set("fit", "max");
  if (!p.has("auto") && !p.has("fm")) p.set("auto", "format");
  p.set("q", String(quality ?? 75));
  return url.toString();
}
