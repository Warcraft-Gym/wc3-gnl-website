"use client";

import { useEffect, useState } from "react";
import { Coins, House, ShoppingBag } from "lucide-react";
import type { CreepMap, Place, PlaceAt } from "@/lib/creep-routes/types";
import { kindForClick } from "@/lib/creep-routes/place.mjs";
import { neutralIconFor } from "@/lib/creep-routes/neutral-icons";
import { nearTarget } from "@/lib/creep-routes/place-targets.mjs";
import { cn } from "@/lib/utils";

export type PlaceTarget = {
  key: string;
  place: Place;
  /** The place's true spot, 0..1 of the map. */
  x: number;
  y: number;
  label: string;
  glyph: "start" | "mine" | "shop";
  /** A base: yours or theirs, told apart by a corner dot in the colours of the two X marks. */
  base?: "you" | "them";
};

/** Every base, gold mine and shop with an icon, with the kind a click there starts with (`kindForClick`).
 *  A name several targets share is numbered in map order ("Gold mine 2", "Their base 2"). */
export function placeTargetsOf(map: CreepMap, youStart: number): PlaceTarget[] {
  const youPlayer = String(map.starts[youStart]?.player ?? "");
  const target = (key: string, at: PlaceAt, x: number, y: number, label: string, glyph: PlaceTarget["glyph"], base?: PlaceTarget["base"]): PlaceTarget => ({
    key,
    place: { kind: kindForClick(at, youPlayer), at } as Place,
    x,
    y,
    label,
    glyph,
    base,
  });
  const all = [
    ...map.starts.map((s, i) =>
      target(`start-${s.player}`, { start: String(s.player) }, s.x, s.y, i === youStart ? "Your base" : "Their base", "start", i === youStart ? "you" : "them"),
    ),
    ...map.mines.map((m, i) => target(`mine-${i}`, { mine: String(i) }, m.x, m.y, "Gold mine", "mine")),
    ...map.shops.flatMap((s) => {
      const icon = neutralIconFor(s.id);
      return icon ? [target(`shop-${s.id}`, { shop: s.id }, s.x, s.y, icon.label, "shop")] : [];
    }),
  ];
  const count = new Map<string, number>();
  for (const t of all) count.set(t.label, (count.get(t.label) ?? 0) + 1);
  const seen = new Map<string, number>();
  return all.map((t) => {
    if (count.get(t.label)! < 2) return t;
    const n = (seen.get(t.label) ?? 0) + 1;
    seen.set(t.label, n);
    return { ...t, label: `${t.label} ${n}` };
  });
}

/** A target button's name: their base adds an attack, any other target a waypoint. */
export function targetName(t: PlaceTarget) {
  return t.place.kind === "attack" ? `Add an attack at ${t.label.replace(/^Their/, "their")}` : `Add a waypoint at ${t.label}`;
}

const GLYPH = { start: House, mine: Coins, shop: ShoppingBag };

/**
 * Places mode (`CreepMap` with `placesMode`): a layer over the map where every base, gold mine and shop
 * is a 32px button at its laid-out spot (`layout`, px of the drawn map, `layoutTargets`). A click within
 * `MAGNET` px outside a disc takes that target; anywhere else adds a free point where it was made.
 * Hover or focus names the target beside it and reports it (`onHover`) for the map's preview.
 */
export function PlaceTargets({
  targets,
  layout,
  width,
  height,
  onPick,
  onHover,
  snap,
}: {
  targets: PlaceTarget[];
  layout: { x: number; y: number }[];
  width: number;
  height: number;
  onPick: (place: Place) => void;
  onHover: (index: number | null) => void;
  /** A waypoint mark being dragged: the targets show and take no click; the one it snaps to (an index) is ringed and named. */
  snap?: number | null;
}) {
  const [hoverShown, setShown] = useState<number | null>(null);
  // A pick, Cancel or Escape unmounts the targets with no pointer-leave or blur: the map's preview clears.
  useEffect(() => () => onHover(null), [onHover]);
  const dragging = snap !== undefined;
  const shown = dragging ? snap : hoverShown;
  const show = (i: number | null) => {
    setShown(i);
    onHover(i);
  };
  const named = shown === null ? null : layout[shown];
  return (
    <div
      data-places
      aria-hidden={dragging || undefined}
      className={cn("absolute inset-0", dragging ? "pointer-events-none" : "cursor-crosshair")}
      onClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - box.left, y = e.clientY - box.top;
        const near = box.width && box.height ? nearTarget((x / box.width) * width, (y / box.height) * height, layout) : -1;
        if (near >= 0) return onPick(targets[near].place);
        // ponytail: a free point is pointer-only, no keyboard path picks one; a keyboard user takes a target or "No place".
        const at = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
        const point = { x: at(x / (box.width || 1)), y: at(y / (box.height || 1)) };
        onPick({ kind: kindForClick(point, ""), at: point } as Place);
      }}
    >
      {targets.map((t, i) => {
        const Glyph = GLYPH[t.glyph];
        const spot = layout[i];
        return (
          <button
            key={t.key}
            type="button"
            data-place-target={t.glyph}
            data-snap={(dragging && snap === i) || undefined}
            tabIndex={dragging ? -1 : undefined}
            aria-label={targetName(t)}
            style={{ left: `${(spot.x / width) * 100}%`, top: `${(spot.y / height) * 100}%` }}
            className="absolute -ml-4 -mt-4 grid size-8 cursor-pointer place-items-center rounded-full border-[1.5px] border-gold bg-bg text-gold hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg data-snap:outline-2 data-snap:outline-offset-2 data-snap:outline-gold"
            onClick={(e) => {
              e.stopPropagation();
              onPick(t.place);
            }}
            onPointerEnter={() => show(i)}
            onPointerLeave={() => show(null)}
            onFocus={() => show(i)}
            onBlur={() => show(null)}
          >
            <Glyph aria-hidden size={16} className="pointer-events-none" />
            {t.base ? (
              <span aria-hidden className={`pointer-events-none absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[1.5px] border-black ${t.base === "you" ? "bg-loss" : "bg-win"}`} />
            ) : null}
          </button>
        );
      })}
      {named && shown !== null ? (
        <span
          aria-hidden
          data-place-label
          style={
            named.x > width * 0.6
              ? { right: `${100 - ((named.x - 22) / width) * 100}%`, top: `${(named.y / height) * 100}%` }
              : { left: `${((named.x + 22) / width) * 100}%`, top: `${(named.y / height) * 100}%` }
          }
          className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap rounded-full border border-line-strong bg-bg/95 px-2 py-0.5 text-[0.78rem] text-fg"
        >
          {targets[shown].label}
        </span>
      ) : null}
    </div>
  );
}
