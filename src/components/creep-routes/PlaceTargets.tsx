import type { CreepMap, Place } from "@/lib/creep-routes/types";
import { neutralIconFor } from "@/lib/creep-routes/neutral-icons";
import { placeRadius } from "./PlaceGlyph";

/**
 * The editor's click targets for place stops, drawn inside `CreepMap`'s SVG. Without
 * `pointArmed`: one transparent circle over each start, gold mine and shop with an icon,
 * drawn under the camps so a camp keeps its click where the two overlap. With
 * `pointArmed`: one transparent layer over the whole map; the next click adds a point.
 */
// ponytail: a start, mine or shop fully under a camp's button takes no mouse click; Tab reaches its target.
export function PlaceTargets({
  map,
  youStart,
  onPlaceSelect,
  pointArmed,
}: {
  map: CreepMap;
  youStart: number;
  onPlaceSelect: (place: Place) => void;
  pointArmed: boolean;
}) {
  const { width: iw, height: ih } = map.image;
  if (pointArmed) {
    return (
      <rect
        data-point-target
        x={0}
        y={0}
        width={iw}
        height={ih}
        fill="transparent"
        className="cursor-crosshair"
        onClick={(e) => {
          const box = (e.currentTarget.ownerSVGElement ?? e.currentTarget).getBoundingClientRect();
          const at = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
          onPlaceSelect({ kind: "point", x: at((e.clientX - box.left) / box.width), y: at((e.clientY - box.top) / box.height) });
        }}
      />
    );
  }
  const targets: { key: string; place: Place; x: number; y: number; label: string }[] = [
    ...map.starts.map((s, i) => ({
      key: `start-${s.player}`,
      place: { kind: "start", id: String(s.player) } as Place,
      x: s.x,
      y: s.y,
      label: i === youStart ? "your base" : "their base",
    })),
    ...map.mines.map((m, i) => ({ key: `mine-${i}`, place: { kind: "mine", id: String(i) } as Place, x: m.x, y: m.y, label: "a gold mine" })),
    ...map.shops.flatMap((s) => {
      const icon = neutralIconFor(s.id);
      return icon ? [{ key: `shop-${s.id}`, place: { kind: "shop", id: s.id } as Place, x: s.x, y: s.y, label: icon.label }] : [];
    }),
  ];
  return (
    <g data-place-targets>
      {targets.map((t) => (
        <circle
          key={t.key}
          data-place-target={t.place.kind}
          cx={t.x * iw}
          cy={t.y * ih}
          r={placeRadius(t.place, iw, t.label === "your base") + 1.5}
          fill="transparent"
          role="button"
          tabIndex={0}
          aria-label={`Add a stop at ${t.label}`}
          className="cursor-pointer focus-visible:[outline:none] focus-visible:[stroke:var(--wg-gold)] focus-visible:[stroke-width:1.5]"
          onClick={() => onPlaceSelect(t.place)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onPlaceSelect(t.place);
            }
          }}
        >
          <title>{`Add a stop at ${t.label}`}</title>
        </circle>
      ))}
    </g>
  );
}
