import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { NEUTRAL_ICONS, rawcodeFromShopId, neutralIconFor } from "./neutral-icons.mjs";

const MAP_ICONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../public/map-icons");

test("rawcodeFromShopId takes the shop id's first four characters", () => {
  assert.equal(rawcodeFromShopId("ntav-16"), "ntav");
  assert.equal(rawcodeFromShopId("nmr3-9"), "nmr3");
});

test("neutralIconFor resolves a known rawcode and returns null for an unknown one", () => {
  assert.deepEqual(neutralIconFor("ngme-6"), { icon: "goblin-merchant", label: "Goblin Merchant" });
  assert.deepEqual(neutralIconFor("nmer-0"), { icon: "mercenary-camp", label: "Mercenary Camp" });
  assert.equal(neutralIconFor("nrat-4"), null); // a decorative critter, not a shop
  assert.equal(neutralIconFor("hrdh-20"), null); // seen on Autumn Leaves, no Liquipedia icon
});

test("nmr1 (not a real unit) is deliberately absent", () => {
  assert.equal(NEUTRAL_ICONS.nmr1, undefined);
});

test("every icon file NEUTRAL_ICONS references actually exists under public/map-icons", () => {
  const present = new Set(readdirSync(MAP_ICONS_DIR));
  for (const [rawcode, { icon }] of Object.entries(NEUTRAL_ICONS)) {
    assert.ok(present.has(`${icon}.png`), `${rawcode} -> ${icon}.png is missing from public/map-icons`);
  }
});
