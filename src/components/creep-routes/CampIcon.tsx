"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ICON_DIR: Record<"creep" | "item", string> = { creep: "creeps", item: "items" };

/**
 * A creep or item icon from the F011 catalogue (`public/wc3-icons/{creeps,items}/
 * <key>.png`, see the F011 handoff) — the camp card's own icon, distinct
 * from `GameIcon` (`src/components/builds/GameIcon.tsx`), which resolves
 * the *build-order* icon manifest under a different path and naming
 * scheme. Falls back to a lettered chip on a 404 — the same pattern
 * `GameIcon` uses (a plain `onError`, plus a mount-time check for the case
 * where the 404 fires before hydration attaches the handler) — covering
 * the two creep icons `scripts/creep-maps/icons-missing.json` names as
 * absent from Liquipedia (`BTNICeTroll`, `BTNMurlocFlesheater`) and any
 * item icon that turns out missing too.
 */
export function CampIcon({
  iconKey,
  title,
  kind,
  size = 32,
  className,
}: {
  iconKey?: string;
  title: string;
  kind: "creep" | "item";
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setBroken(true);
  }, []);

  if (broken || !iconKey) {
    const initials = title
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return (
      <span
        title={title}
        style={{ width: size, height: size }}
        className={cn(
          "grid shrink-0 place-items-center rounded border border-line-strong bg-surface-2 font-display text-[0.55rem] font-bold text-gold",
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
      src={`/wc3-icons/${ICON_DIR[kind]}/${iconKey}.png`}
      alt=""
      title={title}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn("shrink-0 rounded border border-line-strong bg-surface-2 object-cover", className)}
    />
  );
}
