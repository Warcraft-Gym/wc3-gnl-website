import { memo } from "react";
import type { CampCardTrigger, MapCamp } from "@/lib/creep-routes/types";
import { BAND_TOKEN } from "./RouteBadges";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

/** Radius scales modestly with the camp's summed level, clamped so a level-1
 *  camp is still easy to hit and a level-20+ camp doesn't swallow the map.
 *  In SVG user units (viewBox space). Fixed regardless of `active`: the
 *  "grow when active" effect is a `transform: scale()` on a wrapper `<g>`,
 *  not a change to this radius — see the wrapper below. */
export function radiusFor(level: number) {
  return Math.min(11, Math.max(5, 4 + level * 0.3));
}

/**
 * One creep camp on the minimap: a filled circle in its band colour, with
 * the stop number badge (drawn by `RoutePath`) layered over it when the
 * camp is on the route. Interactive when `onCampSelect` is given, in one of
 * two shapes: a real `<button>` via `foreignObject` (`asGroup` unset) — the
 * editor's (F005) click target, one camp id, two `data-camp`-bearing
 * elements — or the outer `<g>` itself made a focusable custom button
 * (`role="button" tabIndex=0`, `asGroup` set) — the read-only route page's
 * click target (F009), kept to *one* `data-camp` per camp so C-017's count
 * stays exact even though only some camps there are ever clickable (the
 * ones on the route being read, never every camp on the map). Plain,
 * non-interactive `<g>` when `onCampSelect` is omitted entirely. Every
 * shape carries `data-camp` so the contract, future features, and the
 * parent's delegated hover handler can count/target camps. `React.memo`d:
 * `CreepMap` hovers one camp at a time, and re-rendering every other marker
 * on each pointer move was measured costly on a 20+ camp map (see the F009
 * review, code-b.md item 3) — this only pays off if the parent passes
 * stable callbacks (`useCallback`), which `CreepMap` does.
 */
export const CampMarker = memo(function CampMarker({
  camp,
  imageWidth,
  imageHeight,
  active,
  highlighted,
  pressed,
  onCampSelect,
  asGroup,
  onCampCardOpen,
  cardOpen,
}: {
  camp: MapCamp;
  imageWidth: number;
  imageHeight: number;
  active?: boolean;
  highlighted?: boolean;
  /** Whether the camp already has a stop on the route being edited (F005's
   *  editor) or read (F009's route page); exposed as `aria-pressed`. */
  pressed?: boolean;
  onCampSelect?: (campId: string) => void;
  /** See the component doc comment: renders the `<g>` itself as the click
   *  target instead of adding a nested `<button>`. */
  asGroup?: boolean;
  /** Pins the F012 camp card for this marker (F012a: hover already opens it
   *  unpinned — see `CreepMap`'s delegated pointer handlers — this is the
   *  click/keyboard-activate path that pins). Wired two different ways
   *  depending on `asGroup`: on the read-only route page (`asGroup`), a
   *  plain click already selects the row *and* pins the card — there's no
   *  competing "click" meaning to protect. In the editor (not `asGroup`), a
   *  left click still only adds/removes a stop (`onCampSelect`) — changing
   *  that would silently break the click-to-author flow — so the card
   *  opens on right-click (`onContextMenu`) instead; see `CreepMap`'s doc
   *  comment and DESIGN.md §Creep routes for the "say which" note the F012
   *  spec asked for. */
  onCampCardOpen?: (campId: string, el: CampCardTrigger) => void;
  /** F012a: whether the camp card is currently open (pinned or hovered) for
   *  *this* camp — drives `aria-expanded` on the marker's own interactive
   *  element (C-025). */
  cardOpen?: boolean;
}) {
  const reduced = useReducedMotion();
  const cx = camp.x * imageWidth;
  const cy = camp.y * imageHeight;
  const r = radiusFor(camp.level);
  const fill = BAND_TOKEN[camp.band] ?? "var(--wg-text-faint)";

  const dot = (
    // The "grow when active" effect: a `transform: scale()` on this
    // wrapper, not a CSS transition of the circles' own `r` attribute
    // (the previous approach) — `r` is geometry, so transitioning it
    // forces layout/paint on every active-stop change instead of a
    // compositor-only step (DESIGN.md's motion rule; see the F009 review,
    // code-b.md item 2). `transform-box: fill-box` has no Tailwind
    // utility, so it's the one inline style left; the scale itself and its
    // transition are Tailwind classes so `motion-reduce:transition-none`
    // can actually override them (an inline `transition` can't be beaten
    // by an external stylesheet rule without `!important` — a class-vs-class
    // override, which this now is, wins on source order instead).
    <g
      style={{ transformBox: "fill-box" }}
      className={cn(
        "origin-center transition-transform duration-[var(--wg-dur-fast)] ease-[var(--wg-ease)] motion-reduce:transition-none",
        active ? "scale-[1.35]" : "scale-100",
      )}
    >
      {active ? (
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={fill} strokeOpacity="0.55" strokeWidth="2">
          {/* The pulsing ring is SMIL, which no CSS transition/class can
           *  pause — it must be omitted outright under reduced motion
           *  (DESIGN.md's motion rule; see the F009 review, code-b.md
           *  item 2's second bullet). The ring itself still renders,
           *  static, so "this stop is active" stays visible with no
           *  motion. */}
          {!reduced ? (
            <animate attributeName="r" values={`${r + 3};${r + 7};${r + 3}`} dur="1.4s" repeatCount="indefinite" />
          ) : null}
        </circle>
      ) : null}
      {/* Liquipedia's hard-band red is only ~3:1 against black on its own
       *  (see globals.css); this light halo — drawn just outside the dark
       *  under-stroke below — keeps every band's mark readable against any
       *  terrain colour, light or dark. */}
      <circle cx={cx} cy={cy} r={r + 1.5} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={highlighted ? "var(--wg-gold)" : "var(--wg-bg)"}
        strokeWidth={highlighted ? 2 : 1.5}
      />
    </g>
  );

  if (onCampSelect && asGroup) {
    // The `<g>` itself is the button — `role="button"`, `tabIndex=0`,
    // Enter/Space activates — instead of a nested `<foreignObject><button>`,
    // so this camp carries exactly one `data-camp`. Used by the read-only
    // route page, where only *some* camps (the route's own stops) are ever
    // clickable; the editor keeps the classic button path below, unchanged.
    return (
      <g
        data-camp={camp.id}
        role="button"
        tabIndex={0}
        aria-label={`Camp ${camp.id}, ${camp.band}, level ${camp.level}${pressed ? ", on the route" : ""}`}
        aria-pressed={pressed ?? false}
        aria-expanded={cardOpen ?? false}
        onClick={(e) => {
          onCampSelect(camp.id);
          onCampCardOpen?.(camp.id, e.currentTarget);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onCampSelect(camp.id);
            onCampCardOpen?.(camp.id, e.currentTarget);
          }
        }}
        className="cursor-pointer [outline:none] focus-visible:[outline:2px_solid_var(--wg-gold)] focus-visible:[outline-offset:2px]"
      >
        {dot}
      </g>
    );
  }

  if (onCampSelect) {
    // A real interactive element for the editor to hook into, sized to the
    // marker's (unscaled) bounding box. Left click still only toggles the
    // stop (unchanged) — a right click opens the camp card instead, so the
    // click-to-author flow never gains a second meaning for its one click.
    const size = (r + 4) * 2;
    return (
      <g data-camp={camp.id}>
        {dot}
        <foreignObject x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
          <button
            type="button"
            data-camp={camp.id}
            onClick={() => onCampSelect(camp.id)}
            onContextMenu={(e) => {
              if (!onCampCardOpen) return;
              e.preventDefault();
              onCampCardOpen(camp.id, e.currentTarget);
            }}
            aria-label={`Camp ${camp.id}, ${camp.band}, level ${camp.level}${pressed ? ", on the route" : ""}`}
            aria-pressed={pressed ?? false}
            aria-expanded={cardOpen ?? false}
            style={{ width: "100%", height: "100%", borderRadius: "50%" }}
            className="cursor-pointer bg-transparent"
          />
        </foreignObject>
      </g>
    );
  }

  return <g data-camp={camp.id}>{dot}</g>;
});
