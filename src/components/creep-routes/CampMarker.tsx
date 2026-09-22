import type { MapCamp } from "@/lib/creep-routes/types";
import { BAND_TOKEN } from "./RouteBadges";

/** Radius scales modestly with the camp's summed level, clamped so a level-1
 *  camp is still easy to hit and a level-20+ camp doesn't swallow the map.
 *  In SVG user units (viewBox space) — exported so `CampDetails` can offset
 *  its panel clear of the marker's actual rendered edge, not just its
 *  centre. */
export function radiusFor(level: number) {
  return Math.min(11, Math.max(5, 4 + level * 0.3));
}

/**
 * One creep camp on the minimap: a filled circle in its band colour, with
 * the stop number badge (drawn by `RoutePath`) layered over it when the
 * camp is on the route. Renders as a real `<button>` (via `foreignObject`)
 * when `onCampSelect` is given — the editor (F005) click target — and as a
 * plain, non-interactive `<g>` otherwise; either way it always carries
 * `data-camp` so the contract and future features can count/target camps.
 */
export function CampMarker({
  camp,
  imageWidth,
  imageHeight,
  active,
  highlighted,
  pressed,
  onCampSelect,
  onPointerEnter,
  onPointerLeave,
}: {
  camp: MapCamp;
  imageWidth: number;
  imageHeight: number;
  active?: boolean;
  highlighted?: boolean;
  /** Whether the camp already has a stop on the route being edited (F005's
   *  editor); exposed as `aria-pressed` on the real button below. */
  pressed?: boolean;
  onCampSelect?: (campId: string) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const cx = camp.x * imageWidth;
  const cy = camp.y * imageHeight;
  const r = radiusFor(camp.level) * (active ? 1.35 : 1);
  const fill = BAND_TOKEN[camp.band] ?? "var(--wg-text-faint)";

  const dot = (
    <>
      {active ? (
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={fill} strokeOpacity="0.55" strokeWidth="2">
          <animate
            attributeName="r"
            values={`${r + 3};${r + 7};${r + 3}`}
            dur="1.4s"
            repeatCount="indefinite"
          />
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
        style={{ transition: "r var(--wg-dur-fast) var(--wg-ease)" }}
        className="motion-reduce:transition-none"
      />
    </>
  );

  if (onCampSelect) {
    // A real interactive element for the editor to hook into, sized to the
    // marker's bounding box.
    const size = (r + 4) * 2;
    return (
      <g data-camp={camp.id} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
        {dot}
        <foreignObject x={cx - size / 2} y={cy - size / 2} width={size} height={size}>
          <button
            type="button"
            data-camp={camp.id}
            onClick={() => onCampSelect(camp.id)}
            aria-label={`Camp ${camp.id}, ${camp.band}, level ${camp.level}${pressed ? ", on the route" : ""}`}
            aria-pressed={pressed ?? false}
            style={{ width: "100%", height: "100%", borderRadius: "50%" }}
            className="cursor-pointer bg-transparent"
          />
        </foreignObject>
      </g>
    );
  }

  return (
    <g data-camp={camp.id} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      {dot}
    </g>
  );
}
