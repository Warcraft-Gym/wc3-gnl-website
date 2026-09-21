/**
 * F001-followup-3: the executable form of "camps line up with coff-creeps".
 *
 * `scripts/creep-maps/__fixtures__/autumn-leaves/coff-reference.json` is
 * coff-creeps' own 20 Autumn Leaves camp locations + 2 spawns, normalised
 * over its minimap image (a Liquipedia preview of the same in-game
 * minimap `war3mapMap.blp` produces) — see its `source` field. Under the
 * *playable* rect (terrain minus the w3i "complements" border, see
 * `map-info.mjs`) our world coordinates matched coff's with mean/max error
 * 0.0000 (orchestrator evidence, `bounds.mjs`); under the raw terrain rect
 * the error was 0.076 mean. This test is the regression guard for that.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import autumnLeaves from "./maps/autumn-leaves.json" with { type: "json" };

const COFF_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../scripts/creep-maps/__fixtures__/autumn-leaves/coff-reference.json",
);
const coff = JSON.parse(readFileSync(COFF_PATH, "utf8"));

const MAX_DISTANCE = 0.01;

function nearestDistance(point, candidates) {
  let best = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(point.x - c.x, point.y - c.y);
    if (d < best) best = d;
  }
  return best;
}

test("every Autumn Leaves camp is within 0.01 normalised distance of a coff-creeps reference camp", () => {
  assert.equal(autumnLeaves.camps.length, 20);
  assert.equal(coff.camps.length, 20);

  let maxDistance = 0;
  for (const camp of autumnLeaves.camps) {
    const d = nearestDistance(camp, coff.camps);
    maxDistance = Math.max(maxDistance, d);
    assert.ok(d <= MAX_DISTANCE, `camp ${camp.id} at (${camp.x}, ${camp.y}) is ${d.toFixed(4)} from the nearest coff camp`);
  }
  // Surfaced for the handoff's "coff-reference test output (max distance)".
  console.log(`coff-reference: max camp distance = ${maxDistance.toFixed(4)}`);
});

test("both starts are within 0.01 normalised distance of coff-creeps' spawns", () => {
  assert.equal(autumnLeaves.starts.length, 2);
  assert.equal(coff.spawns.length, 2);

  let maxDistance = 0;
  for (const start of autumnLeaves.starts) {
    const d = nearestDistance(start, coff.spawns);
    maxDistance = Math.max(maxDistance, d);
    assert.ok(d <= MAX_DISTANCE, `start (player ${start.player}) at (${start.x}, ${start.y}) is ${d.toFixed(4)} from the nearest coff spawn`);
  }
  console.log(`coff-reference: max start distance = ${maxDistance.toFixed(4)}`);
});
