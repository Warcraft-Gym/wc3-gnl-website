import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expandPool, EXTRA_ITEM_INFO } from "../../../scripts/creep-maps/drops.mjs";

/**
 * Contract slice (F011-followup-1): for every pool in
 * `evidence/liquipedia-pools.json` (copied verbatim into `__fixtures__/`),
 * our `expandPool`'s icon set equals Liquipedia's exactly — this fails if
 * `POOL_OVERRIDES` (see `drops.mjs`) regresses.
 *
 * Runs offline against `__fixtures__/itemdata-sample.json`, a minimal
 * extract of the real `itemdata.slk`/`itemfunc.txt` mirror this feature
 * downloaded (every `pickRandom=1` row for class Permanent/Charged/PowerUp,
 * plus the handful of override-only ids that fail that raw filter — see
 * this feature's handoff for the exact download recipe) rather than the
 * full source files, which per the mission's own rule are never checked
 * into the repo.
 */

const EVIDENCE_PATH = fileURLToPath(new URL("../../../scripts/creep-maps/__fixtures__/liquipedia-pools.json", import.meta.url));
const ITEMDATA_SAMPLE_PATH = fileURLToPath(
  new URL("../../../scripts/creep-maps/__fixtures__/itemdata-sample.json", import.meta.url),
);

const evidence = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
const sample = JSON.parse(readFileSync(ITEMDATA_SAMPLE_PATH, "utf8"));

const itemdataIndex = new Map(sample.rows.map((row) => [row.itemID, row]));

function iconSetFor(cls, level) {
  const ids = expandPool(itemdataIndex, cls, level);
  return new Set(
    ids.map((id) => EXTRA_ITEM_INFO[id]?.icon ?? sample.icons[id]),
  );
}

// "Power Up|1" is the one pool this feature's investigation could not fully
// reproduce: Liquipedia's evidence includes a `BTNRune` icon that no
// itemfunc.txt entry (in either w3x2lni mirror checked) resolves to a real,
// rollable Power Up Level 1 item — see drops.mjs's `POOL_OVERRIDES` comment
// for the full account. Named here explicitly rather than silently dropped.
const KNOWN_GAPS = {
  "Power Up|1": ["BTNRune"],
};

for (const [poolKey, icons] of Object.entries(evidence.pools)) {
  test(`expandPool reproduces Liquipedia's "${poolKey}" pool`, () => {
    const [clsRaw, levelRaw] = poolKey.split("|");
    const cls = clsRaw.replace(/\s/g, "");
    const level = Number(levelRaw);

    const actual = iconSetFor(cls, level);
    const expected = new Set(icons);
    const gap = new Set(KNOWN_GAPS[poolKey] ?? []);

    for (const icon of expected) {
      if (gap.has(icon)) {
        assert.ok(!actual.has(icon), `${poolKey}: ${icon} was expected to remain an unresolved gap`);
        continue;
      }
      assert.ok(actual.has(icon), `${poolKey}: missing ${icon}`);
    }
    for (const icon of actual) {
      assert.ok(expected.has(icon), `${poolKey}: unexpected extra icon ${icon}`);
    }
  });
}

test("every evidence pool is covered by exactly one test above", () => {
  assert.equal(Object.keys(evidence.pools).length, 12);
});
