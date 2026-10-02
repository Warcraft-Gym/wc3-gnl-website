/**
 * Which stops the map draws and which legs join them (`RoutePath`), by stop key, before any
 * geometry. Legs run between consecutive drawn stops in route order. A split's paths all start at
 * the node before it (or your start, key "start", when the split opens the route), and every
 * path's last stop sends a leg into the first shared stop after it. "or"/"xor" draw only the
 * chosen path; "and" draws every path, the paths after the first "thin". A waypoint done by
 * another unit (`hero: false`, a lone scout) keeps its disc but gets no leg in or out: it is
 * ordered in time, not on the hero's way, so the hero's line runs from the stop before it to
 * the stop after it. Plain JS so `node --test` runs `route-legs.test.mjs`.
 */
import { isWaypoint } from "./place.mjs";
import { numberStops, walkedArm } from "./stop-numbers.mjs";

/** A waypoint done by another unit: no legs into or out of it. */
export function offTheLine(stop) {
  return isWaypoint(stop) && stop.hero === false;
}

/** `{ nodes, legs }`: `nodes` are `{ key, label, stop, absent }` (a stop the hero does not go to is
 *  `absent`), `legs` are `{ a, b, style }` keys ("start" for your base) with style "solid" or "thin".
 *  `spot(stop)` says whether a stop has a place on the map (a base action without one has none). */
export function routeLegs(stops, choice = {}, spot = (s) => Boolean(s.campId || s.place)) {
  const numbers = numberStops(stops, choice);
  const nodes = [];
  const legs = [];
  let pending = [];
  stops.forEach((s, i) => {
    const n = numbers[i];
    if (!s.split) {
      if (!spot(s)) return;
      nodes.push({ key: n.key, label: n.label, stop: s, absent: s.hero === false });
      if (offTheLine(s)) return;
      for (const p of pending) legs.push({ a: p.key, b: n.key, style: p.style });
      pending = [{ key: n.key, style: "solid" }];
      return;
    }
    const and = s.split.mode === "and";
    const walked = walkedArm(s, n.key, choice);
    const anchor = pending[0]?.key ?? "start";
    const ends = [];
    s.split.arms.forEach((arm, a) => {
      const thin = a !== walked;
      if (thin && !and) return;
      const style = thin ? "thin" : "solid";
      let p = anchor;
      arm.stops.forEach((as, j) => {
        if (!spot(as)) return;
        const key = n.arms[a].stops[j].key;
        nodes.push({ key, label: n.arms[a].stops[j].label, stop: as, absent: as.hero === false || (and && a > 0) });
        if (offTheLine(as)) return;
        legs.push({ a: p, b: key, style });
        p = key;
      });
      ends.push({ key: p, style, walked: a === walked });
    });
    // The walked path first: a split right after this one starts from it.
    pending = [...ends.filter((e) => e.walked), ...ends.filter((e) => !e.walked)].map(({ key, style }) => ({ key, style }));
  });
  return { nodes, legs };
}
