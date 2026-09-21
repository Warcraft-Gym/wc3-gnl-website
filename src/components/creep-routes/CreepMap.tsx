"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CreepMap as CreepMapType, MapMine, MapStart, RouteStop } from "@/lib/creep-routes/types";
import { CampMarker } from "./CampMarker";
import { RoutePath } from "./RoutePath";
import { CampDetails } from "./CampDetails";
import { cn } from "@/lib/utils";

export type CreepMapProps = {
  map: CreepMapType;
  route?: { stops: RouteStop[] };
  /** 0-based index into `route.stops`; enlarges/glows that stop's marker
   *  when it's a camp stop. Lifted by the page so the map and the step
   *  table's play-along clock stay in sync. */
  activeStop?: number | null;
  /** Unused in this feature; the editor (F005) passes this to make camps
   *  clickable — see `CampMarker`. */
  onCampSelect?: (campId: string) => void;
  highlightCamps?: Set<string>;
  className?: string;
};

function StartMarker({ start, iw, ih }: { start: MapStart; iw: number; ih: number }) {
  const cx = start.x * iw;
  const cy = start.y * ih;
  // Two players get two distinct rings: solid for P1, dashed for P2.
  return (
    <g data-start={start.player}>
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill="none"
        stroke="var(--wg-gold)"
        strokeWidth="2"
        strokeDasharray={start.player === 2 ? "2 2" : undefined}
      />
      <text x={cx} y={cy + 3} textAnchor="middle" className="tnum select-none fill-gold text-[7px] font-bold">
        P{start.player}
      </text>
    </g>
  );
}

function MineMarker({ mine, iw, ih }: { mine: MapMine; iw: number; ih: number }) {
  const cx = mine.x * iw;
  const cy = mine.y * ih;
  const s = 5;
  return (
    <rect
      data-mine=""
      x={cx - s}
      y={cy - s}
      width={s * 2}
      height={s * 2}
      transform={`rotate(45 ${cx} ${cy})`}
      fill="var(--wg-gold)"
      stroke="var(--wg-bg)"
      strokeWidth="1"
    />
  );
}

/**
 * The creep map: the minimap image with camps (coloured by difficulty
 * band), the two start spots, the gold mines and — when a route is given —
 * the numbered route path. One SVG keyboard stop like `MmrChart`: arrow
 * keys walk the route's camp stops (or every camp, with no route), Escape
 * clears, and an `aria-live` region names the current camp for anyone who
 * isn't hovering it. The real `<table>` fallback for assistive tech is
 * `RouteStepTable`, rendered by the page below this component.
 */
export function CreepMap({ map, route, activeStop = null, onCampSelect, highlightCamps, className }: CreepMapProps) {
  const [width, setWidth] = useState(0);
  const [hoverCamp, setHoverCamp] = useState<string | null>(null);
  const [walkIndex, setWalkIndex] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: iw, height: ih } = map.image;
  const height = width ? Math.round((width * ih) / iw) : 0;

  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);

  // Keyboard walk order: the route's camp stops in order, or every camp on
  // the map when there is no route to walk.
  const walkCampIds = useMemo(() => {
    if (route) return route.stops.map((s) => s.campId).filter((id): id is string => !!id);
    return map.camps.map((c) => c.id);
  }, [route, map.camps]);

  const walkCampId = walkIndex != null ? (walkCampIds[walkIndex] ?? null) : null;
  const detailCampId = hoverCamp ?? walkCampId;
  const detailCamp = detailCampId ? (campById.get(detailCampId) ?? null) : null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (!walkCampIds.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      setWalkIndex((w) => (w == null ? 0 : Math.min(walkCampIds.length - 1, w + 1)));
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      setWalkIndex((w) => (w == null ? walkCampIds.length - 1 : Math.max(0, w - 1)));
      e.preventDefault();
    } else if (e.key === "Escape") {
      setWalkIndex(null);
      e.preventDefault();
    }
  }

  const label = `${map.name} minimap, ${map.camps.length} creep camps${
    route ? `, ${route.stops.length} route stops` : ""
  }. Arrow keys walk the camps, escape clears the readout.`;

  return (
    <div ref={box} className={cn("panel relative overflow-hidden p-3", className)}>
      {/* No `width === 0` gate: the map must be in the server-rendered HTML
          (a curl gets exactly what a browser gets pre-hydration), so sizing
          is CSS-driven (`viewBox` + `w-full h-auto`, no numeric width/height
          attributes) rather than waiting on the client-only ResizeObserver.
          `width`/`height` state still feeds `CampDetails`'s pixel position,
          which is a hover/focus enhancement, not first-paint content. */}
      <svg
        viewBox={`0 0 ${iw} ${ih}`}
        role="img"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setWalkIndex(null)}
        className="block h-auto w-full touch-pan-y rounded [outline:none] focus-visible:[outline:2px_solid_var(--wg-gold)] focus-visible:[outline-offset:2px]"
      >
        <image href={map.minimapUrl} x={0} y={0} width={iw} height={ih} preserveAspectRatio="none" />
        {route ? <RoutePath map={map} stops={route.stops} activeStop={activeStop} /> : null}
        {map.starts.map((s) => (
          <StartMarker key={s.player} start={s} iw={iw} ih={ih} />
        ))}
        {map.mines.map((m, i) => (
          <MineMarker key={i} mine={m} iw={iw} ih={ih} />
        ))}
        {map.camps.map((camp) => {
          const stopIndex = route?.stops.findIndex((s) => s.campId === camp.id) ?? -1;
          return (
            <CampMarker
              key={camp.id}
              camp={camp}
              imageWidth={iw}
              imageHeight={ih}
              active={activeStop != null && stopIndex === activeStop}
              highlighted={highlightCamps?.has(camp.id) ?? false}
              pressed={stopIndex !== -1}
              onCampSelect={onCampSelect}
              onPointerEnter={() => setHoverCamp(camp.id)}
              onPointerLeave={() => setHoverCamp((h) => (h === camp.id ? null : h))}
            />
          );
        })}
      </svg>

      <p aria-live="polite" className="sr-only">
        {detailCamp
          ? `Camp ${detailCamp.id}: ${detailCamp.band} difficulty, level ${detailCamp.level}, ${detailCamp.xp} xp${
              detailCamp.sleeps ? ", sleeps until attacked" : ""
            }`
          : "No camp selected"}
      </p>

      {detailCamp && width ? (
        <CampDetails camp={detailCamp} x={detailCamp.x * width} y={detailCamp.y * height} containerWidth={width} />
      ) : null}
    </div>
  );
}
