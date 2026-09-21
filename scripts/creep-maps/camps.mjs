/** Turns a map's placed units into camps, start spots, mines and shops.
 *
 * Creeps are `player === 24` (neutral hostile), everything else neutral is
 * `player === 27` (neutral passive) — gold mines (`typeId === "ngol"`)
 * included, so mines are shops minus the mine typeId.
 */
import { creepXp } from "../../src/lib/creep-routes/xp.mjs";

/** Single-linkage clustering distance, in world units (verified: gives 20
 * camps of 3-4 creeps each on Autumn Leaves). */
export const CAMP_CLUSTER_THRESHOLD = 700;

/** Summed camp level → difficulty band (documented properly in DESIGN.md;
 * the cutoffs sit near the 33rd/66th percentile of summed camp level
 * across the eight catalogues (min 5, p33 10, p50 14, p66 17, max 26) —
 * easy tops out at 9 because a level-1 hero can solo a camp that light). */
export const BAND_MAX_LEVEL = { easy: 9, medium: 15 };

function bandFor(level) {
  if (level <= BAND_MAX_LEVEL.easy) return "easy";
  if (level <= BAND_MAX_LEVEL.medium) return "medium";
  return "hard";
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Connected components of `points` (each needs `.x`/`.y`) under
 * single-linkage clustering at `threshold`: any two points closer than
 * `threshold` end up in the same cluster, transitively. */
function singleLinkageClusters(points, threshold) {
  const parent = points.map((_, i) => i);
  function find(i) {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(i, j) {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (distance(points[i], points[j]) <= threshold) union(i, j);
    }
  }

  const groups = new Map();
  points.forEach((p, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(p);
  });
  return [...groups.values()];
}

function normalise(worldX, worldY, bounds) {
  const { xMin, xMax, yMin, yMax } = bounds;
  return {
    x: (worldX - xMin) / (xMax - xMin),
    y: (yMax - worldY) / (yMax - yMin),
  };
}

/** `bounds` is the playable rect (see `map-info.mjs`'s `computePlayableBounds`):
 * a handful of decorative units — usually creeps or shops the map author
 * dropped in the unplayable border — sit outside it. Those are dropped
 * (never clamped: a clamped position would silently lie about where the
 * unit actually is) rather than shipped with a `x`/`y` outside `[0, 1]`. */
function withinBounds(worldX, worldY, bounds) {
  return worldX >= bounds.xMin && worldX <= bounds.xMax && worldY >= bounds.yMin && worldY <= bounds.yMax;
}

/** Counts how many of `units`' would-be camp/start/mine/shop members
 * (`player === 24`, `typeId === "sloc"`, `typeId === "ngol"`, or
 * `player === 27`) sit outside `bounds` — for the build script's stdout
 * summary. These units are silently excluded by `buildCamps`/`buildStarts`/
 * `buildMines`/`buildShops` themselves; this is purely for reporting. */
export function countDroppedOutsideBounds(units, bounds) {
  return units.filter(
    (u) => (u.player === 24 || u.typeId === "sloc" || u.typeId === "ngol" || u.player === 27) && !withinBounds(u.x, u.y, bounds),
  ).length;
}

function centroid(units) {
  const worldX = units.reduce((s, u) => s + u.x, 0) / units.length;
  const worldY = units.reduce((s, u) => s + u.y, 0) / units.length;
  return { worldX, worldY };
}

/** Builds camps from the map's creep units (`player === 24`, dropped if
 * outside `bounds` — the playable rect), clustered by
 * `CAMP_CLUSTER_THRESHOLD`. `lookupCreep(rawcode)` must return
 * `{ name, level, sleeps }` or throw — never guess an unknown id.
 *
 * `idCentre` (defaults to `bounds`'s own centre) is the point camp ids are
 * ordered from (distance, then angle). `build.mjs` passes the *terrain*
 * centre here rather than `bounds`'s (playable) centre: the playable rect
 * is off-centre on several maps (Echo Isles, Last Refuge, Shallow Grave,
 * Tidehunters, Turtle Rock, Twisted Meadows — their `complements` border
 * isn't symmetric), which would otherwise reshuffle camp ids for a change
 * that has nothing to do with where any camp actually is. */
export function buildCamps(units, bounds, lookupCreep, idCentre) {
  const creepUnits = units.filter((u) => u.player === 24 && withinBounds(u.x, u.y, bounds));
  const clusters = singleLinkageClusters(creepUnits, CAMP_CLUSTER_THRESHOLD);

  const centre = idCentre ?? {
    x: (bounds.xMin + bounds.xMax) / 2,
    y: (bounds.yMin + bounds.yMax) / 2,
  };

  const withPosition = clusters.map((clusterUnits) => {
    const { worldX, worldY } = centroid(clusterUnits);
    return {
      clusterUnits,
      worldX,
      worldY,
      distanceFromCentre: Math.hypot(worldX - centre.x, worldY - centre.y),
      angle: Math.atan2(worldY - centre.y, worldX - centre.x),
    };
  });

  withPosition.sort((a, b) => a.distanceFromCentre - b.distanceFromCentre || a.angle - b.angle);

  return withPosition.map((camp, index) => {
    const id = `c${String(index + 1).padStart(2, "0")}`;
    const byType = new Map();
    for (const unit of camp.clusterUnits) {
      byType.set(unit.typeId, (byType.get(unit.typeId) ?? 0) + 1);
    }

    let level = 0;
    let xp = 0;
    let allSleep = true;
    const creeps = [...byType.entries()].map(([rawcode, count]) => {
      const info = lookupCreep(rawcode);
      level += info.level * count;
      xp += creepXpTotal(info.level, count);
      if (!info.sleeps) allSleep = false;
      return { id: rawcode, name: info.name, level: info.level, count };
    });

    const { x, y } = normalise(camp.worldX, camp.worldY, bounds);
    return {
      id,
      x,
      y,
      worldX: camp.worldX,
      worldY: camp.worldY,
      creeps,
      level,
      xp,
      band: bandFor(level),
      sleeps: allSleep,
    };
  });
}

function creepXpTotal(level, count) {
  return creepXp(level) * count;
}

/** Start locations (`typeId === "sloc"`), dropped if outside `bounds`. */
export function buildStarts(units, bounds) {
  return units
    .filter((u) => u.typeId === "sloc" && withinBounds(u.x, u.y, bounds))
    .map((u) => {
      const { x, y } = normalise(u.x, u.y, bounds);
      return { player: u.player, x, y, worldX: u.x, worldY: u.y };
    });
}

/** Gold mines (`typeId === "ngol"`), dropped if outside `bounds`. */
export function buildMines(units, bounds) {
  return units
    .filter((u) => u.typeId === "ngol" && withinBounds(u.x, u.y, bounds))
    .map((u) => {
      const { x, y } = normalise(u.x, u.y, bounds);
      return { x, y, worldX: u.x, worldY: u.y, gold: u.gold };
    });
}

/** Neutral-passive buildings that are not gold mines: shops, taverns,
 * mercenary camps, decor. Unknown ids are allowed here, unlike creeps.
 * Dropped if outside `bounds`. */
export function buildShops(units, bounds) {
  return units
    .filter((u) => u.player === 27 && u.typeId !== "ngol" && withinBounds(u.x, u.y, bounds))
    .map((u, i) => {
      const { x, y } = normalise(u.x, u.y, bounds);
      return { id: `${u.typeId}-${i}`, x, y };
    });
}
