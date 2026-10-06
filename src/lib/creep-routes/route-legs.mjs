/**
 * Which stops the map draws and which legs join them (`RoutePath`), by stop key, before any
 * geometry. Legs run between consecutive drawn stops in route order. A split's paths all start at
 * the node before it (or your start, key "start", when the split opens the route), and every
 * path's last stop sends a leg into the first shared stop after it. "or"/"xor" draw only the
 * chosen path; "and" draws every path: a path the hero goes on (`pathHasHero`) as the main line, the
 * others "thin". The line joins the steps that are places, in order: a pin (`isPin`) is a node with
 * no legs, and the legs join the steps around it. Plain JS so `node --test` runs `route-legs.test.mjs`.
 */
import { isPin, pathHasHero } from "./place.mjs";
import { numberStops, walkedArm } from "./stop-numbers.mjs";

/** `{ nodes, legs }`: `nodes` are `{ key, label, stop, absent, pin }` (a stop whose own flag is off,
 *  `hero: false`, is `absent`; a pin has no legs), `legs` are `{ a, b, style }` keys ("start" for your base) with
 *  style "solid" or "thin". `spot(stop)` says whether a stop is drawn: it has a place (a step with no
 *  place has none). */
export function routeLegs(stops, choice = {}, spot = (s) => Boolean(s.campId || s.place)) {
  const numbers = numberStops(stops, choice);
  const nodes = [];
  const legs = [];
  let pending = [];
  stops.forEach((s, i) => {
    const n = numbers[i];
    if (!s.split) {
      if (!spot(s)) return;
      const pin = isPin(s);
      nodes.push({ key: n.key, label: n.label, stop: s, absent: s.hero === false, pin });
      if (pin) return;
      for (const p of pending) legs.push({ a: p.key, b: n.key, style: p.style });
      pending = [{ key: n.key, style: "solid" }];
      return;
    }
    const and = s.split.mode === "and";
    const walked = walkedArm(s, n.key, choice);
    const anchor = pending[0]?.key ?? "start";
    const ends = [];
    s.split.arms.forEach((arm, a) => {
      if (!and && a !== walked) return;
      const thin = and && !pathHasHero(s.split.arms, a);
      const style = thin ? "thin" : "solid";
      let p = anchor;
      arm.stops.forEach((as, j) => {
        if (!spot(as)) return;
        const key = n.arms[a].stops[j].key;
        const pin = isPin(as);
        nodes.push({ key, label: n.arms[a].stops[j].label, stop: as, absent: as.hero === false, pin });
        if (pin) return;
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
