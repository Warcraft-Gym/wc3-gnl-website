import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseUnitsDoo } from "../../../scripts/creep-maps/units-doo.mjs";
import { parseW3i, parseW3eBounds, computePlayableBounds } from "../../../scripts/creep-maps/map-info.mjs";
import { buildCamps, buildStarts, buildMines, buildShops } from "../../../scripts/creep-maps/camps.mjs";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../scripts/creep-maps/__fixtures__/autumn-leaves",
);

// Playable rect = terrain minus war3map.w3i's "complements" border (F001
// followup-3): Autumn Leaves is 15/15/15/15 tiles all around, terrain
// ±8192 → playable ±6272. `buildCamps`/`buildStarts`/etc. normalise over
// *this*, not the raw terrain grid — see `computePlayableBounds`.
function loadFixture() {
  const doo = parseUnitsDoo(readFileSync(join(FIXTURES, "war3mapUnits.doo")));
  const { bounds: terrainBounds } = parseW3eBounds(readFileSync(join(FIXTURES, "war3map.w3e.header")));
  const { complements } = parseW3i(readFileSync(join(FIXTURES, "war3map.w3i")));
  const bounds = computePlayableBounds(terrainBounds, complements);
  return { units: doo.units, bounds, terrainBounds, complements };
}

test("Autumn Leaves fixture's playable rect is ±6272 (terrain ±8192 minus 15 tiles all around)", () => {
  const { bounds, complements } = loadFixture();
  assert.deepEqual(complements, [15, 15, 15, 15]);
  assert.deepEqual(bounds, { xMin: -6272, xMax: 6272, yMin: -6272, yMax: 6272 });
});

// A stub lookup good enough to exercise clustering/geometry without
// depending on the real (network-sourced) creeps.json.
const stubLookup = (rawcode) => ({ name: rawcode, level: 3, sleeps: true });

test("clusters Autumn Leaves' 66 creeps into 20 camps of 2-4 creeps each", () => {
  const { units, bounds } = loadFixture();
  const camps = buildCamps(units, bounds, stubLookup);

  assert.equal(camps.length, 20);
  for (const camp of camps) {
    const count = camp.creeps.reduce((sum, c) => sum + c.count, 0);
    assert.ok(count >= 2 && count <= 4, `camp ${camp.id} has ${count} creeps`);
    assert.ok(camp.x >= 0 && camp.x <= 1);
    assert.ok(camp.y >= 0 && camp.y <= 1);
    assert.ok(Number.isInteger(camp.level) && camp.level > 0);
  }
});

test("camps are (near) rotationally symmetric about the map centre", () => {
  const { units, bounds } = loadFixture();
  const camps = buildCamps(units, bounds, stubLookup);

  // Real placement is hand-made, not machine-mirrored, so allow a little
  // slack past the 60-unit figure from the probe: the worst pair on the
  // real file (c15/c16) sits at ~63 units.
  const TOLERANCE = 70;
  for (const camp of camps) {
    const mirror = camps.find(
      (other) => Math.hypot(other.worldX + camp.worldX, other.worldY + camp.worldY) <= TOLERANCE,
    );
    assert.ok(mirror, `no mirror camp found for ${camp.id} at (${camp.worldX}, ${camp.worldY})`);
  }
});

test("builds 2 starts, 6 mines (gold sorts to the sourced values) and shops", () => {
  const { units, bounds } = loadFixture();

  const starts = buildStarts(units, bounds);
  assert.equal(starts.length, 2);
  assert.deepEqual(
    starts.map((s) => s.player).sort(),
    [0, 1],
  );

  const mines = buildMines(units, bounds);
  assert.deepEqual(
    mines.map((m) => m.gold).sort((a, b) => a - b),
    [12000, 12000, 12000, 12000, 12500, 12500],
  );

  const shops = buildShops(units, bounds);
  assert.equal(shops.length, 27);
  assert.ok(shops.every((s) => s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1));
});

test("buildCamps propagates the lookup's error for an unknown rawcode", () => {
  const { units, bounds } = loadFixture();
  assert.throws(
    () =>
      buildCamps(units, bounds, (rawcode) => {
        throw new Error(`unknown creep rawcode: ${rawcode}`);
      }),
    /unknown creep rawcode/,
  );
});
