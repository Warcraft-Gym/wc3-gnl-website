import type { MapCamp } from "@/lib/creep-routes/types";
import { BandDot } from "./RouteBadges";
import { cn } from "@/lib/utils";

/**
 * The hover/focus panel for one camp: not a `title` tooltip (those show on
 * neither touch nor keyboard focus) but a real floating panel, positioned
 * over the point the pointer or the keyboard walk landed on and clamped
 * inside the map's container so it never spills off the card.
 */
export function CampDetails({
  camp,
  x,
  y,
  containerWidth,
}: {
  camp: MapCamp;
  /** Marker centre in container pixels. */
  x: number;
  y: number;
  containerWidth: number;
}) {
  // Clamp so a camp near an edge doesn't push the panel off the card; the
  // panel itself is ~13rem (208px) wide.
  const PANEL_W = 208;
  const half = PANEL_W / 2;
  const left = Math.min(Math.max(x, half + 8), Math.max(half + 8, containerWidth - half - 8));
  const above = y > 90;

  return (
    <div
      aria-hidden
      className={cn(
        "panel pointer-events-none absolute z-20 w-52 origin-bottom border-gold/40 bg-surface/95 p-3 text-xs shadow-[0_12px_30px_-10px_rgba(0,0,0,.9)] transition-opacity duration-[var(--wg-dur-fast)] motion-reduce:transition-none",
      )}
      style={{
        left,
        top: above ? y - 14 : y + 14,
        transform: above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
    >
      <p className="flex items-center gap-1.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.1em] text-fg">
        <BandDot band={camp.band} /> {`Camp ${camp.id}`}
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
