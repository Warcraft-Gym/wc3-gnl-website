import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseW3i } from "../../../scripts/creep-maps/map-info.mjs";

const FIXTURE = fileURLToPath(
  new URL("../../../scripts/creep-maps/__fixtures__/autumn-leaves/war3map.w3i", import.meta.url),
);

test("parses the checked-in Autumn Leaves war3map.w3i exactly, with no random item tables", () => {
  const buf = readFileSync(FIXTURE);
  const { version, complements, randomItemTables } = parseW3i(buf);
  assert.equal(version, 31);
  assert.deepEqual(complements, [15, 15, 15, 15]);
  // Confirmed empty by construction (F011 spec): none of the nine bundle
  // maps use the map-level random item table indirection — every unit's
  // own `itemTablePointer` is -1, drops come from `droppedItemSets` alone.
  assert.deepEqual(randomItemTables, []);
});

test("throws if the file has trailing bytes past the last parsed field", () => {
  const buf = readFileSync(FIXTURE);
  const padded = Buffer.concat([buf, Buffer.alloc(10)]);
  assert.throws(() => parseW3i(padded), /war3map\.w3i/);
});

test("throws (truncated mid-field) if the file is too short", () => {
  const buf = readFileSync(FIXTURE);
  assert.throws(() => parseW3i(buf.subarray(0, buf.length - 10)));
});

// A minimal synthetic war3map.w3i (version 25, so the version>=28
// gameVersion block is skipped) — 0 players/forces/upgrades/tech/random
// unit tables, then one random item table with two sets. None of the nine
// bundle maps actually populate this section (see the test above), so this
// exercises the random-item-table branch the real fixture can't.
function buildSyntheticW3i({ randomItemTables }) {
  const chunks = [];
  const i32 = (v) => {
    const b = Buffer.alloc(4);
    b.writeInt32LE(v);
    chunks.push(b);
  };
  const f32 = (v) => {
    const b = Buffer.alloc(4);
    b.writeFloatLE(v);
    chunks.push(b);
  };
  const u8 = (v) => chunks.push(Buffer.from([v]));
  const cstr = (s) => chunks.push(Buffer.from(s + "\0", "latin1"));
  const chars4 = (s) => chunks.push(Buffer.from(s.padEnd(4, "\0").slice(0, 4), "latin1"));

  i32(25); // version < 28: no gameVersion block
  i32(0); // saves
  i32(0); // editorVersion
  cstr("Test Map");
  cstr("Author");
  cstr("Description");
  cstr("2");
  for (let i = 0; i < 8; i++) f32(0);
  for (let i = 0; i < 4; i++) i32(0); // complements
  i32(64); // playable width
  i32(64); // playable height
  i32(0); // flags
  u8("A".charCodeAt(0)); // tileset
  i32(-1); // campaign bg
  i32(0); // loading screen bg
  cstr(""); // loading text
  cstr(""); // loading title
  cstr(""); // loading subtitle
  i32(0); // game data set
  i32(0); // fog type
  f32(3000);
  f32(5000);
  f32(0.5);
  u8(0);
  u8(0);
  u8(0);
  u8(255); // fog color + alpha
  chars4("\0\0\0\0"); // weather
  cstr(""); // sound environment
  u8("A".charCodeAt(0)); // light environment tileset
  u8(255);
  u8(255);
  u8(255);
  u8(255); // water tint + alpha
  i32(0);
  i32(0);
  i32(0); // the unidentified trailing trio
  i32(0); // player count
  i32(0); // force count
  i32(0); // upgrade count
  i32(0); // tech count
  i32(0); // random unit table count
  i32(randomItemTables.length);
  for (const table of randomItemTables) {
    i32(table.id);
    cstr(table.name);
    i32(table.sets.length);
    for (const set of table.sets) {
      i32(set.length);
      for (const item of set) {
        i32(item.chance);
        chars4(item.itemId);
      }
    }
  }
  return Buffer.concat(chunks);
}

test("parses map-level random item tables (synthetic, since no bundle map uses one)", () => {
  const buf = buildSyntheticW3i({
    randomItemTables: [
      {
        id: 7,
        name: "loot table",
        sets: [
          [{ itemId: "ckng", chance: 50 }],
          [
            { itemId: "YiI2", chance: 25 },
            { itemId: "rwat", chance: 75 },
          ],
        ],
      },
      { id: 9, name: "empty table", sets: [] },
    ],
  });

  const { randomItemTables } = parseW3i(buf);
  assert.deepEqual(randomItemTables, [
    {
      id: 7,
      name: "loot table",
      sets: [
        [{ itemId: "ckng", chance: 50 }],
        [
          { itemId: "YiI2", chance: 25 },
          { itemId: "rwat", chance: 75 },
        ],
      ],
    },
    { id: 9, name: "empty table", sets: [] },
  ]);
});
