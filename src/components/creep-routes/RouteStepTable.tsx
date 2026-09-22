"use client";

import { useMemo, useRef, useState } from "react";
import { deriveRoute } from "@/lib/creep-routes/derive.mjs";
import { campLabel, campComposition, conditionLabel } from "@/lib/creep-routes/camp-label.mjs";
import type { CreepMap, CreepRoute } from "@/lib/creep-routes/types";
import { GameIcon } from "@/components/builds/GameIcon";
import { BandDot } from "./RouteBadges";
import { cn } from "@/lib/utils";

/**
 * The route itself: an ordered table of stops, no time dimension. Clicking
 * a row (or pressing Enter/Space once it has focus) *selects* it —
 * reported to the page via `onActiveChange`, so `CreepMap` glows the same
 * stop's marker, and vice versa: clicking a marker selects the matching
 * row (F009 — `active`/`onActiveChange` are fully controlled by the
 * parent, so both directions agree on one piece of state). Selection is a
 * sticky toggle: the *same* click or Enter/Space clears it again.
 *
 * Two things are deliberately *not* wired into `active`, both because a
 * real mouse click always fires them first, which would otherwise fight
 * the toggle above (click an already-"active" row → immediately read as
 * "deselect", reproducing the exact silent-no-op the F009 review's ux.md
 * item 1 found for a plain row click):
 * - **Hover** is a separate, purely cosmetic preview (`hoverIndex`, local,
 *   uncommitted, mouse only).
 * - **Focus.** A mouse click on a focusable element focuses it *before*
 *   the click event fires (standard browser order: mousedown → focus →
 *   click) — an `onFocus` handler driving `active` would read the
 *   just-focused value inside the very click that's supposed to toggle it.
 *   Only an explicit Enter/Space (see `onKeyDown` below) selects via the
 *   keyboard, mirroring `CampMarker`'s own `asGroup` keyboard handling —
 *   not bare `Tab`-focus.
 *
 * Every row carries `data-stop`, the map's numbered badges carry
 * `data-stop-marker` instead, so the two never double-count.
 */
export function RouteStepTable({
  route,
  map,
  active = null,
  onActiveChange,
}: {
  route: CreepRoute;
  map: CreepMap;
  /** Controlled: which stop index is selected, or null. Lifted to the page
   *  (`CreepMapPlayground`) so the map and the table always agree. */
  active?: number | null;
  onActiveChange?: (index: number | null) => void;
}) {
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const derived = useMemo(() => deriveRoute(route, map), [route, map]);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-3 sm:px-5">
        <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">
          Route{" "}
          <span className="font-sans text-sm font-normal normal-case tracking-normal text-muted">
            · {route.stops.length} stops
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="route-step-table w-full border-collapse text-sm md:table-fixed">
          <caption className="border-b border-line/60 px-4 py-2 text-left text-xs text-muted sm:px-5">
            Bring: units to take into the fight · Hero after: your hero&apos;s level and XP once the camp is cleared.
          </caption>
          {/* `table-fixed` + these widths are what stop the browser from
              collapsing Notes toward zero as Camp/Bring content grows (the
              reported bug: Camp ate almost the full row). Notes has no
              explicit width — it takes whatever's left, which is the
              majority of the row once # and Hero after are pinned and
              Camp/Bring are kept modest; see DESIGN.md "Table anatomy". */}
          <colgroup>
            <col style={{ width: "2.5rem" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "12%" }} />
            <col />
            <col style={{ width: "7rem" }} />
          </colgroup>
          <thead>
            <tr className="text-left font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
              <th className="px-3 py-2.5 text-center font-medium sm:px-4">#</th>
              <th className="px-2 py-2.5 font-medium">Camp</th>
              <th className="px-2 py-2.5 font-medium">Bring</th>
              <th className="px-2 py-2.5 font-medium">Notes</th>
              <th className="whitespace-nowrap px-2 py-2.5 font-medium">Hero after</th>
            </tr>
          </thead>
          <tbody>
            {route.stops.map((stop, i) => {
              const d = derived.stops[i];
              const isActive = i === active;
              const isHovered = i === hoverIndex;
              return (
                <tr
                  key={i}
                  data-stop={i + 1}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  tabIndex={0}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
                  onClick={() => onActiveChange?.(active === i ? null : i)}
                  onKeyDown={(e) => {
                    // A `<tr>` isn't a native button, so Enter/Space needs
                    // an explicit handler — same toggle as a click, so
                    // keyboard and mouse selection agree exactly (mirrors
                    // `CampMarker`'s own `asGroup` keyboard handling).
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onActiveChange?.(active === i ? null : i);
                    }
                  }}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "cursor-pointer border-t border-line/40 transition-colors",
                    (isActive || isHovered) && "bg-gold/10",
                  )}
                >
                  <td data-label="#" className="tnum px-3 py-2.5 text-center text-xs text-faint sm:px-4">
                    {isActive ? (
                      <span aria-hidden className="inline-block size-2 rounded-full bg-gold shadow-[0_0_10px_var(--wg-gold-glow)]" />
                    ) : (
                      i + 1
                    )}
                  </td>
                  <td data-label="Camp" className="px-2 py-2.5">
                    {d.camp ? (
                      <div className="min-w-0">
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <BandDot band={d.band} />
                          <span className="font-medium text-fg">{campLabel(d.camp)}</span>
                          <span className="tnum text-faint">Lv {d.camp.level}</span>
                        </span>
                        <p className="mt-0.5 line-clamp-2 text-xs text-faint">{campComposition(d.camp)}</p>
                      </div>
                    ) : (
                      <span className="text-muted">{stop.action ?? "-"}</span>
                    )}
                  </td>
                  <td data-label="Bring" className="px-2 py-2.5">
                    {stop.units?.length ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {stop.units.map((u, ui) => (
                          <span key={ui} className="inline-flex items-center gap-1">
                            <GameIcon iconKey={u.icon} size={22} />
                            {u.count > 1 ? <span className="tnum text-xs text-faint">×{u.count}</span> : null}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td data-label="Notes" className="px-2 py-2.5 text-xs text-muted">
                    <span className="flex flex-col items-start gap-1">
                      {stop.condition ? (
                        <span
                          title="Condition"
                          className="inline-flex w-fit max-w-full items-center whitespace-normal rounded border border-arcane/40 bg-arcane/10 px-1.5 py-0.5 text-[0.65rem] leading-snug text-arcane"
                        >
                          {conditionLabel(stop.condition)}
                        </span>
                      ) : null}
                      {stop.note ? <span>{stop.note}</span> : null}
                      {!stop.note && !stop.condition ? <span className="text-faint">-</span> : null}
                    </span>
                  </td>
                  <td data-label="Hero after" className="tnum whitespace-nowrap px-2 py-2.5 text-xs text-muted">
                    {`Lv ${d.heroLevelAfter} · ${d.xpAfter} xp`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
