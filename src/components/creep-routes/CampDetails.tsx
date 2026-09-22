import { useLayoutEffect, useRef, useState } from "react";
import type { MapCamp } from "@/lib/creep-routes/types";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import { BandDot } from "./RouteBadges";
import { cn } from "@/lib/utils";

/** Offset from the marker's edge to the panel's nearest edge, in pixels. */
const OFFSET = 12;

/**
 * The hover/focus panel for one camp: not a `title` tooltip (those show on
 * neither touch nor keyboard focus) but a real floating panel, anchored
 * `OFFSET`px clear of the marker's own circle that triggered it (hover or
 * keyboard-walk focus alike — both feed the same `x`/`y`). It flips to the
 * opposite side of the marker when it would otherwise overflow the map's
 * right or bottom edge, and is clamped so it's never clipped or pushed off
 * the card.
 *
 * The parent must be `position: relative` with no padding/border between
 * it and the element whose pixel box `x`/`y`/`containerWidth`/
 * `containerHeight` were measured from (see `CreepMap`) — otherwise the
 * panel's containing block (the padding edge) won't line up with the
 * coordinate system the marker position was computed in.
 *
 * `position: absolute` is set inline, not only via the Tailwind utility
 * class: this component reuses the design system's `.panel` class for its
 * background/border/blur, and `.panel` (in `globals.css`) also declares
 * `position: relative` for its own unrelated purpose (`.panel`s are
 * normally static cards, not always absolutely positioned overlays). Both
 * rules live in the same `@layer utilities` at equal specificity, so which
 * one wins is a source-order accident — it previously lost, and the panel
 * rendered in normal document flow far below the map instead of over the
 * marker. An inline style always outranks an external stylesheet rule
 * (short of `!important`), so it's pinned here regardless of cascade order.
 */
export function CampDetails({
  camp,
  x,
  y,
  containerWidth,
  containerHeight,
  markerRadius,
}: {
  camp: MapCamp;
  /** Marker centre, in pixels, relative to the positioned ancestor. */
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  /** The marker's own rendered radius, in the same pixel space as `x`/`y`,
   *  so the panel clears the circle itself rather than just its centre. */
  markerRadius: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const clear = markerRadius + OFFSET;

  // Two-pass placement: render once (invisible) to measure the panel's real
  // size — its height varies with the camp's creep count — then place it
  // clear of the marker's own circle, flipping to the opposite side near
  // the right/bottom edge and clamping so it's never clipped.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const flipX = x + clear + w > containerWidth;
    const flipY = y + clear + h > containerHeight;
    const left = flipX ? x - clear - w : x + clear;
    const top = flipY ? y - clear - h : y + clear;
    setPos({
      left: Math.min(Math.max(left, 0), Math.max(0, containerWidth - w)),
      top: Math.min(Math.max(top, 0), Math.max(0, containerHeight - h)),
    });
  }, [camp.id, x, y, containerWidth, containerHeight, clear]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "panel pointer-events-none z-20 w-52 border-gold/40 bg-surface/95 p-3 text-xs shadow-[0_12px_30px_-10px_rgba(0,0,0,.9)] transition-opacity duration-[var(--wg-dur-fast)] motion-reduce:transition-none",
      )}
      style={{
        position: "absolute",
        left: pos?.left ?? x,
        top: pos?.top ?? y,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <p className="flex items-center gap-1.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.1em] text-fg">
        <BandDot band={camp.band} /> {campLabel(camp)}
      </p>
      <ul className="mt-1.5 space-y-0.5 text-muted">
        {camp.creeps.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <span className="truncate">
              {c.name} {c.count > 1 ? `×${c.count}` : ""}
            </span>
            <span className="tnum text-faint">{`Lv ${c.level}`}</span>
          </li>
        ))}
      </ul>
      <p className="tnum mt-1.5 flex items-center justify-between border-t border-line/50 pt-1.5 text-faint">
        <span>{`Level ${camp.level} · ${camp.xp} xp`}</span>
        {camp.sleeps ? <span className="text-gold">Sleeps</span> : null}
      </p>
    </div>
  );
}
