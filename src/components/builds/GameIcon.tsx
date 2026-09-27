"use client";

import { useEffect, useRef, useState } from "react";
import { getGameIcon, gameIconSrc } from "@/lib/builds/icons";
import { cn } from "@/lib/utils";

/** A WC3 unit/building icon from the manifest. Falls back to a lettered chip
 *  when the image file isn't in public/wc3-icons yet. */
export function GameIcon({
  iconKey,
  size = 28,
  className,
}: {
  iconKey?: string;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const icon = getGameIcon(iconKey);

  // The 404 can fire before hydration attaches onError, so also check the
  // element's state once mounted.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setBroken(true);
  }, []);

  if (!icon) return null;

  if (broken) {
    const initials = icon.title
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <span
        title={icon.title}
        style={{ width: size, height: size }}
        className={cn(
          "grid shrink-0 place-items-center rounded border border-line-strong bg-surface-2 font-display text-[0.6rem] font-bold text-gold",
          className,
        )}
      >
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={gameIconSrc(icon.key)}
      alt=""
      title={icon.title}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn("shrink-0 rounded border border-line-strong bg-surface-2 object-cover", className)}
    />
  );
}
