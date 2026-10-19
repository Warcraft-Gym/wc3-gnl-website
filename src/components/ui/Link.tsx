"use client";

import NextLink from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * The site's internal link: `next/link`, prefetching on intent instead of on sight.
 *
 * By default Next prefetches every link the moment it scrolls into view. This
 * site shows dozens at once (top bar, Learn menu, footer, card grids), and each
 * prefetch is a billed CDN request: in October 2026 they were about 16 of the
 * ~35 requests behind one page view, almost all for pages nobody opened.
 *
 * Here a link prefetches only when it is hovered, focused or touched, which is
 * still a moment before the click, so navigation stays quick. The pattern is
 * the "Hover-triggered prefetch" one in Next's prefetching guide. Use it for
 * every internal link; import from here, not from `next/link`.
 */
export default function Link({ prefetch, onMouseEnter, onFocus, onTouchStart, ...props }: ComponentProps<typeof NextLink>) {
  const [intent, setIntent] = useState(false);
  return (
    <NextLink
      {...props}
      // An explicit `prefetch` from the caller wins; otherwise wait for intent.
      prefetch={prefetch !== undefined ? prefetch : intent ? null : false}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        setIntent(true);
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        setIntent(true);
        onTouchStart?.(e);
      }}
    />
  );
}
