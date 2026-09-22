/**
 * A map may redefine units and items through the object editor
 * (`war3map.w3u` / `w3t`). We describe creeps and item pools from Blizzard's
 * tables — the map stores only rawcodes — so a map that overrides those
 * definitions would be described with values that are wrong for it, and
 * nothing would fail.
 *
 * `assertNoObjectOverrides` refuses such a map, the same stance `build.mjs`
 * takes on an unknown rawcode: stop, name the problem, never guess.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openMap, assertNoObjectOverrides } from "../../../scripts/creep-maps/mpq.mjs";

const SOURCES = join(dirname(fileURLToPath(import.meta.url)), "../../../map-sources");

/** Minimal object-editor table: version, original-modification count, then
 *  (for the zero-original case) the custom count. */
function objectTable({ original = 0, custom = 0 }) {
  const b = Buffer.alloc(12);
  b.writeInt32LE(3, 0);
  b.writeInt32LE(original, 4);
  b.writeInt32LE(custom, 8);
  return b;
}

function fakeMap(files) {
  return { path: "test.w3x", files: Object.keys(files), read: (name) => files[name] };
}

test("a map that redefines a base unit is refused, naming the table", () => {
  const map = fakeMap({ "war3map.w3u": objectTable({ original: 2 }) });
  assert.throws(() => assertNoObjectOverrides(map), /customises game objects[\s\S]*war3map\.w3u redefines 2/);
});

test("a map that redefines a base item is refused", () => {
  const map = fakeMap({ "war3map.w3t": objectTable({ original: 1 }) });
  assert.throws(() => assertNoObjectOverrides(map), /war3map\.w3t redefines 1/);
});

test("Reforged skin tables are checked too", () => {
  const map = fakeMap({ "war3mapSkin.w3u": objectTable({ original: 5 }) });
  assert.throws(() => assertNoObjectOverrides(map), /war3mapSkin\.w3u redefines 5/);
});

test("an empty table, a custom-only table, and no table at all all pass", () => {
  // Every current ladder map is one of these three. Custom definitions are
  // additions, not overrides — and if one is ever *placed*, build.mjs stops
  // on the unknown rawcode anyway.
  assert.doesNotThrow(() => assertNoObjectOverrides(fakeMap({ "war3map.w3t": objectTable({}) })));
  assert.doesNotThrow(() =>
    assertNoObjectOverrides(fakeMap({ "war3map.w3u": objectTable({ original: 0, custom: 2 }) })),
  );
  assert.doesNotThrow(() => assertNoObjectOverrides(fakeMap({})));
});

test("every checked-in map source passes the guard", () => {
  const maps = readdirSync(SOURCES).filter((f) => /\.w3[xm]$/i.test(f));
  assert.ok(maps.length >= 12, `expected the ladder pool in map-sources/, found ${maps.length}`);
  for (const file of maps) {
    assert.doesNotThrow(() => assertNoObjectOverrides(openMap(join(SOURCES, file))), file);
  }
});
