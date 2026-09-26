/**
 * Regression guard for where camps land on the minimap.
 *
 * Camp/start coordinates are normalised over the **playable** rectangle —
 * the terrain grid minus the unplayable border `war3map.w3i` records as
 * "complements" (see `map-info.mjs`'s `computePlayableBounds`) — not the
 * raw terrain grid. Getting that wrong is silent: every camp simply sits
 * ~23% too close to the centre, which looks plausible until you compare it
 * with the in-game minimap. It shipped that way once.
 *
 * `scripts/creep-maps/__fixtures__/autumn-leaves/camp-placement.json` is the
 * frozen, validated placement for Autumn Leaves v2.0 (see its `source`
 * field for how it was validated). This test fails if a change to the
 * bounds maths, the letterbox rule or the clustering moves any camp.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import autumnLeaves from "./maps/autumn-leaves.json" with { type: "json" };

const REFERENCE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../scripts/creep-maps/__fixtures__/autumn-leaves/camp-placement.json",
);
const reference = JSON.parse(readFileSync(REFERENCE_PATH, "utf8"));

/** Tight enough that a bounds regression (which moves camps by ~0.02 at the
 *  very least, and 0.076 for the terrain-vs-playable mistake) always trips
 *  it, loose enough to tolerate float noise across Node versions. */
const MAX_DISTANCE = 0.001;

function nearestDistance(point, candidates) {
  let best = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(point.x - c.x, point.y - c.y);
    if (d < best) best = d;
  }
  return best;
}

test("Autumn Leaves is still built over the playable rectangle", () => {
  assert.equal(autumnLeaves.mapVersion, reference.mapVersion);
  assert.deepEqual(autumnLeaves.bounds, reference.bounds);
  assert.deepEqual(autumnLeaves.image, reference.image);
});

test("every Autumn Leaves camp sits where the validated reference puts it", () => {
  assert.equal(autumnLeaves.camps.length, reference.camps.length);

  let maxDistance = 0;
  for (const camp of autumnLeaves.camps) {
    const d = nearestDistance(camp, reference.camps);
    maxDistance = Math.max(maxDistance, d);
    assert.ok(
      d <= MAX_DISTANCE,
      `camp ${camp.id} at (${camp.x}, ${camp.y}) is ${d.toFixed(4)} from the nearest reference camp`,
    );
  }
  console.log(`camp-placement: max camp distance = ${maxDistance.toFixed(4)}`);
});

test("both Autumn Leaves starts sit where the validated reference puts them", () => {
  assert.equal(autumnLeaves.starts.length, reference.starts.length);

  let maxDistance = 0;
  for (const start of autumnLeaves.starts) {
    const d = nearestDistance(start, reference.starts);
    maxDistance = Math.max(maxDistance, d);
    assert.ok(
      d <= MAX_DISTANCE,
      `start (player ${start.player}) at (${start.x}, ${start.y}) is ${d.toFixed(4)} from the nearest reference start`,
    );
  }
  console.log(`camp-placement: max start distance = ${maxDistance.toFixed(4)}`);
});
