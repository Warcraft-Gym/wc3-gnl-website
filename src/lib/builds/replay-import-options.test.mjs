import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// F002b: `parseReplayImportOptions` and (for the default-parity /
// non-default-changes-output proof) `parseReplay` + `extractBuild` are all
// TypeScript; `ts-hooks.mjs` lets this `node --test` file import them
// directly, same as `../api/player-profile.test.mjs`.
register("../api/ts-hooks.mjs", import.meta.url);
const { parseReplayImportOptions } = await import("./replay-import-options.ts");
const { parseReplay } = await import("../replay/parseReplay.ts");
const { extractBuild } = await import("../replay/extractBuild.ts");

test("no fields parse to no options at all — extractBuild's own defaults apply", () => {
  const parsed = parseReplayImportOptions({});
  assert.deepEqual(parsed, { ok: true, options: {} });
});

test("explicit valid fields parse (multipart strings and JSON native types alike)", () => {
  const fromMultipart = parseReplayImportOptions({ cutoffSeconds: "120", includeUpgrades: "true", includeItems: "false" });
  assert.deepEqual(fromMultipart, { ok: true, options: { cutoffMs: 120_000, includeUpgrades: true, includeItems: false } });

  const fromJson = parseReplayImportOptions({ cutoffSeconds: 120, includeUpgrades: true, includeItems: false });
  assert.deepEqual(fromJson, { ok: true, options: { cutoffMs: 120_000, includeUpgrades: true, includeItems: false } });
});

test("cutoffSeconds accepts the boundary values 1 and 3600", () => {
  assert.deepEqual(parseReplayImportOptions({ cutoffSeconds: 1 }), { ok: true, options: { cutoffMs: 1000 } });
  assert.deepEqual(parseReplayImportOptions({ cutoffSeconds: 3600 }), { ok: true, options: { cutoffMs: 3_600_000 } });
  assert.deepEqual(parseReplayImportOptions({ cutoffSeconds: "1" }), { ok: true, options: { cutoffMs: 1000 } });
  assert.deepEqual(parseReplayImportOptions({ cutoffSeconds: "3600" }), { ok: true, options: { cutoffMs: 3_600_000 } });
});

test("cutoffSeconds rejects non-integers, out-of-range values and non-numeric strings", () => {
  for (const bad of ["abc", 0, "0", 3601, "3601", 1.5, "1.5", -1, "-1", ""]) {
    const parsed = parseReplayImportOptions({ cutoffSeconds: bad });
    assert.equal(parsed.ok, false, `expected ${JSON.stringify(bad)} to be rejected`);
    assert.match(parsed.error, /cutoffSeconds/);
  }
});

test("includeUpgrades / includeItems accept booleans and their multipart string form", () => {
  assert.deepEqual(parseReplayImportOptions({ includeUpgrades: true }), { ok: true, options: { includeUpgrades: true } });
  assert.deepEqual(parseReplayImportOptions({ includeUpgrades: false }), { ok: true, options: { includeUpgrades: false } });
  assert.deepEqual(parseReplayImportOptions({ includeItems: "true" }), { ok: true, options: { includeItems: true } });
  assert.deepEqual(parseReplayImportOptions({ includeItems: "false" }), { ok: true, options: { includeItems: false } });
});

test("includeUpgrades / includeItems reject anything but true/false", () => {
  for (const field of ["includeUpgrades", "includeItems"]) {
    for (const bad of ["maybe", "1", "0", 1, 0, "True", "yes"]) {
      const parsed = parseReplayImportOptions({ [field]: bad });
      assert.equal(parsed.ok, false, `expected ${field}=${JSON.stringify(bad)} to be rejected`);
      assert.match(parsed.error, new RegExp(field));
    }
  }
});

test("the first invalid field wins: cutoffSeconds is checked before includeUpgrades before includeItems", () => {
  const parsed = parseReplayImportOptions({ cutoffSeconds: "abc", includeUpgrades: "nope", includeItems: "nope" });
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /cutoffSeconds/);
});

// --- Default parity and non-default-changes-output, against a real fixture ---

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "replay", "__fixtures__");
const FIXTURE_FILE = "ced_vs_lyn.w3g";
const PLAYER_ID = 1;

async function extractWith(options) {
  const bytes = new Uint8Array(readFileSync(join(FIXTURES_DIR, FIXTURE_FILE)));
  const summary = await parseReplay(bytes);
  return extractBuild(summary, PLAYER_ID, options);
}

test("no options gives the exact same draft as the explicit defaults (cutoffSeconds: 480, includeUpgrades: true, includeItems: false)", async () => {
  const omitted = parseReplayImportOptions({});
  const explicit = parseReplayImportOptions({ cutoffSeconds: 480, includeUpgrades: true, includeItems: false });
  assert.equal(omitted.ok, true);
  assert.equal(explicit.ok, true);

  const withOmitted = await extractWith(omitted.options);
  const withExplicit = await extractWith(explicit.options);
  assert.deepEqual(withOmitted, withExplicit);
});

test("a non-default cutoffSeconds actually changes the draft's steps", async () => {
  const defaults = parseReplayImportOptions({});
  const shortCutoff = parseReplayImportOptions({ cutoffSeconds: 60 });
  assert.equal(defaults.ok, true);
  assert.equal(shortCutoff.ok, true);

  const withDefaults = await extractWith(defaults.options);
  const withShortCutoff = await extractWith(shortCutoff.options);
  assert.notDeepEqual(withShortCutoff.steps, withDefaults.steps);
  assert.ok(
    withShortCutoff.steps.length <= withDefaults.steps.length,
    "a 1-minute cutoff cannot produce more steps than the 8-minute default",
  );
});

test("includeItems: true actually changes the draft's steps for a fixture with item orders", async () => {
  const withoutItems = await extractWith(parseReplayImportOptions({ includeItems: false }).options);
  const withItems = await extractWith(parseReplayImportOptions({ includeItems: true }).options);
  assert.notDeepEqual(withItems.steps, withoutItems.steps);
});
