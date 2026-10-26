"use client";

import NextImage from "next/image";
import type { ComponentProps } from "react";
import { isSanityImage, sanityImageLoader } from "@/lib/sanity-image-loader.mjs";

/**
 * The site's image: `next/image`, with pictures on Sanity's CDN resized by
 * Sanity instead of Vercel.
 *
 * Optimised images were about a third of the website's CDN requests in October
 * 2026, and each `/_next/image` miss is also an image transformation. Sanity's
 * image pipeline already serves its uploads at any width and format, so those
 * skip Vercel entirely. Every other image (icons, faction art, key art in
 * `public/`) goes through `next/image` as before. Import from here, not from
 * `next/image`.
 */
export default function Image({ loader, ...props }: ComponentProps<typeof NextImage>) {
  return <NextImage {...props} loader={loader ?? (isSanityImage(props.src) ? sanityImageLoader : undefined)} />;
}
