import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCreepTable } from "./creeps.mjs";

/**
 * Contract slice: every `creeps.json` icon and every `items.json` icon
 * either exists under `public/wc3-icons/{creeps,items}/` or is listed in
 * `scripts/creep-maps/icons-missing.json` (fetched from Liquipedia, never
 * guessed — a name Liquipedia doesn't have is recorded, not invented; see
 * `scripts/creep-maps/fetch-icons.mjs`).
 *
 * The filenames are compared **case-sensitively**, against a directory
 * listing rather than `existsSync`. macOS is case-insensitive by default, so
 * `existsSync` happily finds `BTNIceTroll.png` when asked for `BTNICeTroll`
 * — and Vercel's Linux filesystem does not. That is not hypothetical: the
 * Ice Troll Trapper and Warlord shipped with Blizzard's own `BTNICeTroll`
 * casing, which loaded locally and 404'd in production for months.
 */

/** Exact filenames in a directory — a Set that does not lie about case. */
function stems(dir) {
  return new Set(readdirSync(dir).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4)));
}

const ITEMS_PATH = fileURLToPath(new URL("./items.json", import.meta.url));
const OUT_CREEPS = fileURLToPath(new URL("../../../public/wc3-icons/creeps/", import.meta.url));
const OUT_ITEMS = fileURLToPath(new URL("../../../public/wc3-icons/items/", import.meta.url));
const MISSING_PATH = fileURLToPath(new URL("../../../scripts/creep-maps/icons-missing.json", import.meta.url));

function loadMissing() {
  if (!existsSync(MISSING_PATH)) return [];
  return JSON.parse(readFileSync(MISSING_PATH, "utf8"));
}

test("every creeps.json icon exists on disk or is a recorded miss", () => {
  const table = loadCreepTable();
  const missing = new Set(loadMissing().filter((m) => m.side === "creep").map((m) => m.icon));
  const keys = new Set(Object.values(table).map((c) => c.icon).filter(Boolean));
  assert.ok(keys.size > 0);
  const onDisk = stems(OUT_CREEPS);
  for (const key of keys) {
    assert.ok(
      onDisk.has(key) || missing.has(key),
      `creep icon ${key} is neither on disk (exact case) nor in icons-missing.json`,
    );
  }
});

test("every items.json icon exists on disk or is a recorded miss", () => {
  const table = JSON.parse(readFileSync(ITEMS_PATH, "utf8"));
  const missing = new Set(loadMissing().filter((m) => m.side === "item").map((m) => m.icon));
  const keys = new Set(Object.values(table).map((it) => it.icon).filter(Boolean));
  assert.ok(keys.size > 0);
  const onDisk = stems(OUT_ITEMS);
  for (const key of keys) {
    assert.ok(
      onDisk.has(key) || missing.has(key),
      `item icon ${key} is neither on disk (exact case) nor in icons-missing.json`,
    );
  }
});

/**
 * The map catalogues embed each creep's icon key rather than looking it up,
 * so they can drift from `creeps.json` — and they are what the camp cards
 * actually render. The Ice Troll casing was wrong in three catalogues after
 * it was wrong in the table, and nothing compared the two.
 */
test("every catalogue creep icon exists on disk, exact case", () => {
  const dir = fileURLToPath(new URL("./maps/", import.meta.url));
  const onDisk = stems(OUT_CREEPS);
  const missing = new Set(loadMissing().filter((m) => m.side === "creep").map((m) => m.icon));
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 9, `expected the map catalogues, found ${files.length}`);

  const bad = [];
  let checked = 0;
  for (const file of files) {
    const cat = JSON.parse(readFileSync(join(dir, file), "utf8"));
    for (const camp of cat.camps ?? []) {
      for (const creep of camp.creeps ?? []) {
        if (!creep.icon) continue;
        checked++;
        if (!onDisk.has(creep.icon) && !missing.has(creep.icon)) {
          bad.push(`${file}: ${creep.name} (${creep.id}) -> ${creep.icon}`);
        }
      }
    }
  }
  assert.ok(checked > 100, `expected to check plenty of creeps, checked ${checked}`);
  assert.deepEqual([...new Set(bad)], [], "catalogue icons with no file");
});

test("the catalogues and creeps.json agree on every icon", () => {
  const table = loadCreepTable();
  const dir = fileURLToPath(new URL("./maps/", import.meta.url));
  const drift = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const cat = JSON.parse(readFileSync(join(dir, file), "utf8"));
    for (const camp of cat.camps ?? []) {
      for (const creep of camp.creeps ?? []) {
        const expected = table[creep.id]?.icon;
        if (expected && creep.icon && creep.icon !== expected) {
          drift.push(`${creep.id} is ${creep.icon} in ${file}, ${expected} in creeps.json`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(drift)], []);
});
