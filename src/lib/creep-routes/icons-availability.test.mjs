import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCreepTable } from "./creeps.mjs";

/**
 * Contract slice: every `creeps.json` icon and every `items.json` icon
 * either exists under `public/wc3-icons/{creeps,items}/` or is listed in
 * `scripts/creep-maps/icons-missing.json` (fetched from Liquipedia, never
 * guessed — a name Liquipedia doesn't have is recorded, not invented; see
 * `scripts/creep-maps/fetch-icons.mjs`).
 */

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
  for (const key of keys) {
    const onDisk = existsSync(join(OUT_CREEPS, `${key}.png`));
    assert.ok(onDisk || missing.has(key), `creep icon ${key} is neither on disk nor in icons-missing.json`);
  }
});

test("every items.json icon exists on disk or is a recorded miss", () => {
  const table = JSON.parse(readFileSync(ITEMS_PATH, "utf8"));
  const missing = new Set(loadMissing().filter((m) => m.side === "item").map((m) => m.icon));
  const keys = new Set(Object.values(table).map((it) => it.icon).filter(Boolean));
  assert.ok(keys.size > 0);
  for (const key of keys) {
    const onDisk = existsSync(join(OUT_ITEMS, `${key}.png`));
    assert.ok(onDisk || missing.has(key), `item icon ${key} is neither on disk nor in icons-missing.json`);
  }
});
