"use client";

import NextImage from "next/image";
import type { ComponentProps } from "react";
import { isSanityImage, sanityImageLoader } from "@/lib/sanity-image-loader.mjs";
import { servedAsIs } from "@/lib/served-as-is.mjs";

/**
 * The site's image: `next/image`, with pictures on Sanity's CDN resized by
 * Sanity instead of Vercel, and the small faction art loaded as the file.
 *
 * Optimised images were about a third of the website's CDN requests in October
 * 2026, and each `/_next/image` miss is also an image transformation. Sanity's
 * image pipeline already serves its uploads at any width and format, so those
 * skip Vercel entirely. The race icons and crests skip it too, so the browser
 * cache holds them (see `served-as-is.mjs`). Every other image (banners, key
 * art in `public/`) goes through `next/image` as before. Import from here, not
 * from `next/image`.
 */
export default function Image({ loader, unoptimized, ...props }: ComponentProps<typeof NextImage>) {
  return (
    <NextImage
      {...props}
      loader={loader ?? (isSanityImage(props.src) ? sanityImageLoader : undefined)}
      unoptimized={unoptimized ?? servedAsIs(props.src)}
    />
  );
}
