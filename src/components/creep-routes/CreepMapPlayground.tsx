"use client";

import { Fragment, useCallback, useEffect, useReducer, useState } from "react";
import { initialStopView, stopViewReducer } from "@/lib/creep-routes/stop-view.mjs";
import { findStopKey, numberStops, parseKey, stopByKey, stopKeys } from "@/lib/creep-routes/stop-numbers.mjs";
import { CreepMap } from "@/components/creep-routes/CreepMap";
import { MapLegend } from "@/components/creep-routes/MapLegend";
import { RouteStepTable } from "@/components/creep-routes/RouteStepTable";
import { CampCard } from "@/components/creep-routes/CampCard";
import { useCampCard } from "@/components/creep-routes/useCampCard";
import type { CreepMap as CreepMapType, CreepRoute, RouteStop } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";

/**
 * The map and the stop list share two pieces of stop state, lifted here in
 * `stop-view.mjs`'s reducer: the selected stop (the map's pulsing node, the
 * list's gold dot) and the open stops. A marker click selects and opens its
 * stop (or deselects the selected one), a summary click selects and opens,
 * the chevron only opens or closes, Escape deselects (F009: the read-only page was keyboard-only
 * before this — see the F009 review, ux.md item 1). Map left, stops right
 * and sticky at `lg`; stacked below.
 *
 * F012/F012a: also owns the camp card's hover/pin state (`useCampCard`) —
 * every trigger (a stop block, or a map marker's hover/click/keyboard-walk,
 * see `CampMarker`'s and `CreepMap`'s doc comments) reports up through this
 * one hook, so there's exactly one card open at a time regardless of which
 * side opened it. `card.trigger` is the DOM element that opened it: the
 * card anchors near it on desktop, and the hook returns focus to it when
 * the card closes (Escape, the close button, an outside click, or another
 * camp pinned) — the card itself doesn't know or care which kind of
 * element opened it.
 *
 * F012-followup-3: every camp on the map is now interactive (hover/click
 * opens the card, arrow-key walk reaches it), not only the route's own
 * stops — the user asked for the editor's "every camp works" behaviour on
 * this read-only page too. The route's own stops keep their emphasis
 * three ways, none of which needed touching here since they were already
 * driven by `route` itself, not by which camps were clickable: the
 * numbered badge and the path (`RoutePath`), `aria-pressed`/", on the
 * route" in the marker's own label, and — new — a fainter halo ring on
 * every *other* camp's marker (`deemphasizeOffRoute`, see `CampMarker`'s
 * `secondary` prop).
 */
export function CreepMapPlayground({
  map,
  route,
  aside,
  show,
  only,
  startClosed = false,
  stopBody,
}: {
  map: CreepMapType;
  route: CreepRoute;
  /** Rendered under the stop list, inside the right-hand column. */
  aside?: React.ReactNode;
  /** One column only, for a guide that shows the pieces in turn. */
  show?: "map" | "stops";
  /** The stop list shows this one stop, open, with no header (`RouteStepTable`). */
  only?: number;
  /** Every stop starts closed and none selected. */
  startClosed?: boolean;
  /** Replaces the open stop's body (`RouteStepTable`). */
  stopBody?: React.ReactNode;
}) {
  // Stops are named by their `stop-numbers.mjs` keys ("0", "2.a.0").
  const [view, dispatch] = useReducer(stopViewReducer, route.stops.length, (count: number) =>
    only !== undefined
      ? { selected: null, open: new Set([String(only)]) }
      : startClosed
        ? { selected: null, open: new Set<string>() }
        : initialStopView(count, numberStops(route.stops).find((n) => n.label)?.key ?? "0"),
  ) as [{ selected: string | null; open: Set<string> }, React.Dispatch<Record<string, unknown>>];
  const [scrollTo, setScrollTo] = useState<{ key: string } | null>(null);
  // The way the reader follows in each "or"/"xor" split: page state, not URL state.
  const [choice, setChoice] = useState<Record<string, number>>({});
  const { card, openCampId, hoverEnter, hoverLeave, cancelHoverLeave, pin, close } = useCampCard();

  // Escape clears the selection, unless a card or popover is open (it closes that instead).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) dispatch({ type: "deselect" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A marker click selects and opens its stop (`stop-view.mjs`); on the
  // selected stop it deselects. Clicking a camp that ISN'T one of
  // the route's own stops (every camp is clickable now, F012-followup-3)
  // finds no matching stop — `findIndex` returns -1 — and this is a no-op:
  // no stop is selected, nothing crashes.
  // An arm stop of an "or"/"xor" split also chooses its way.
  const onStopSelect = useCallback(
    (key: string) => {
      const { index, arm } = parseKey(key);
      const also = arm === undefined ? [] : [String(index)];
      if (arm !== undefined && route.stops[index]?.split && route.stops[index].split!.mode !== "and") {
        setChoice((c) => (c[String(index)] === arm ? c : { ...c, [String(index)]: arm }));
      }
      dispatch({ type: "node", key, also });
      setScrollTo({ key });
    },
    [route.stops],
  );
  // The top level and the walked arm first, so a camp in two arms keeps the chosen one.
  const onMarkerSelect = useCallback(
    (campId: string) => {
      const key = findStopKey(route.stops, campId, choice);
      if (key) onStopSelect(key);
    },
    [route.stops, choice, onStopSelect],
  );

  const mapColumn = (
    <>
      <CreepMap
        map={map}
        route={route}
        activeStop={view.selected}
        onCampSelect={onMarkerSelect}
        groupMarkers
        walkAllCamps
        deemphasizeOffRoute
        onCampCardPin={pin}
        onCampCardHoverEnter={hoverEnter}
        onCampCardHoverLeave={hoverLeave}
        openCampId={openCampId}
        onStopSelect={onStopSelect}
        choice={choice}
      />
      <MapLegend />
    </>
  );
  const stopColumn = (
    <>
      <RouteStepTable
        route={route}
        map={map}
        selected={view.selected}
        open={view.open}
        onSummary={(key) => dispatch({ type: "summary", key, also: key.includes(".") ? [String(parseKey(key).index)] : [] })}
        onChevron={(key) => dispatch({ type: "chevron", key })}
        onExpandAll={() => dispatch({ type: "expandAll", keys: stopKeys(route.stops) })}
        onCollapseAll={() => dispatch({ type: "collapseAll" })}
        scrollTo={scrollTo}
        onOpenCard={pin}
        openCampId={openCampId}
        only={only}
        stopBody={stopBody}
        choice={choice}
        onChoose={(forkKey, arm) => setChoice((c) => ({ ...c, [forkKey]: arm }))}
      />
      {/* Anything the page wants directly under the stops — the Discord
          card. It belongs *in* this column rather than in a band below the
          grid: the map column is far taller than a short stop list, so a
          three-stop route left a column of dead space that pushed whatever
          followed the whole height of the map down the page. A server
          element in a client child list needs a key, hence the fragment. */}
      <Fragment key="aside">{aside}</Fragment>
    </>
  );

  const cardKey = card ? findStopKey(route.stops, card.camp.id, choice) : null;
  const cardStop: RouteStop | undefined = cardKey ? stopByKey(route.stops, cardKey) : undefined;

  return (
    <div className={cn(!show && "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8")}>
      {show !== "stops" ? (
        <div className={cn("min-w-0", !show && "lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)]")}>{mapColumn}</div>
      ) : null}
      {show !== "map" ? (
        <div className={cn("min-w-0", !show && "lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)]")}>{stopColumn}</div>
      ) : null}
      {card ? (
        <CampCard
          camp={card.camp}
          kills={cardStop?.kills}
          leaveRest={cardStop?.leaveRest}
          anchorEl={card.trigger}
          pinned={card.pinned}
          onClose={close}
          onPointerEnter={cancelHoverLeave}
          onPointerLeave={hoverLeave}
        />
      ) : null}
    </div>
  );
}
