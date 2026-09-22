import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expandPool, EXTRA_ITEM_INFO } from "../../../scripts/creep-maps/drops.mjs";

/**
 * Contract slice (F011-followup-2): for every pool in
 * `evidence/liquipedia-pools-corrected.json` (copied verbatim into
 * `__fixtures__/liquipedia-pools.json`), our `expandPool`'s icon set
 * equals Liquipedia's exactly, with no documented-gap exemption — this
 * fails if `POOL_OVERRIDES` (see `drops.mjs`) regresses.
 *
 * The earlier evidence file (F011-followup-1's `liquipedia-pools.json`)
 * was harvested with a flawed regex that truncated some pools and
 * contaminated others with the next camp's creep icons; this feature's
 * corrected file fixes both and reaches 12/12 exact (F011-followup-1
 * could only reach 11/12, leaving "Power Up Level 1" as a documented,
 * unresolvable gap — the missing `BTNRune` credit turns out to have been
 * the flawed file's own contamination, not a real pool member; see
 * `drops.mjs`'s own doc comment for the full account).
 *
 * Runs offline against `__fixtures__/itemdata-sample.json`, a minimal
 * extract of the real `itemdata.slk`/`itemfunc.txt` mirror this feature
 * (and F011-followup-1 before it) downloaded (every `pickRandom=1` row for
 * class Permanent/Charged/PowerUp, plus the handful of override-only ids
 * that fail that raw filter — see this feature's handoff for the exact
 * download recipe) rather than the full source files, which per the
 * mission's own rule are never checked into the repo. The sample's rows
 * are unchanged from F011-followup-1 — it already carried every id the
 * corrected `POOL_OVERRIDES` touches.
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

for (const [poolKey, icons] of Object.entries(evidence.pools)) {
  test(`expandPool reproduces Liquipedia's "${poolKey}" pool exactly`, () => {
    const [clsRaw, levelRaw] = poolKey.split("|");
    const cls = clsRaw.replace(/\s/g, "");
    const level = Number(levelRaw);

    const actual = iconSetFor(cls, level);
    const expected = new Set(icons);

    assert.deepEqual([...actual].sort(), [...expected].sort(), `${poolKey}: icon set mismatch`);
  });
}

test("every evidence pool is covered by exactly one test above", () => {
  assert.equal(Object.keys(evidence.pools).length, 12);
});
