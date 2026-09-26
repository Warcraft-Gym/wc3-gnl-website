import { test } from "node:test";
import assert from "node:assert/strict";
import { CURRENT_PATCH, PATCHES, PATCH_VALUES, isKnownPatch, normalizePatch, patchLabel } from "./patches.mjs";

/** -1, 0 or 1 comparing two dotted version strings, shorter padded with zeros. */
function compareVersions(a, b) {
  const [x, y] = [a.split(".").map(Number), b.split(".").map(Number)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

test("the list is newest first, so the first entry is the current patch", () => {
  for (let i = 1; i < PATCHES.length; i++) {
    const [prev, cur] = [PATCHES[i - 1].value, PATCHES[i].value];
    assert.equal(compareVersions(prev, cur), 1, `${prev} should sort above ${cur}`);
  }
  assert.equal(CURRENT_PATCH, PATCHES[0].value);
});

test("the comparison the ordering test relies on is itself right", () => {
  assert.equal(compareVersions("3.0", "2.0.4"), 1);
  assert.equal(compareVersions("2.0", "2.0.2"), -1, "2.0 is older than 2.0.2, not equal to it");
  assert.equal(compareVersions("1.36", "1.36.0"), 0);
});

test("values are unique", () => {
  assert.equal(new Set(PATCH_VALUES).size, PATCH_VALUES.length);
});

test("the current patch labels itself, the rest do not", () => {
  assert.match(patchLabel(PATCHES[0]), /\(current\)$/);
  assert.equal(PATCHES.filter((p) => patchLabel(p).includes("current")).length, 1);
  assert.equal(patchLabel({ value: "2.0.4" }), "2.0.4");
  assert.equal(patchLabel({ value: "2.0", note: "Reforged 2.0" }), "2.0 — Reforged 2.0");
  assert.equal(patchLabel(PATCHES[0]), "3.0 — Forsaken Kingdom (current)");
});

test("W3Champions build strings fold onto an option", () => {
  assert.equal(normalizePatch("3.0.0.24268"), "3.0");
  assert.equal(normalizePatch("2.0.4.23452"), "2.0.4");
  assert.equal(normalizePatch("1.32.10"), "1.32");
});

test("the two values the free text box actually produced both survive", () => {
  assert.equal(normalizePatch("2.0.3"), "2.0.3");
  assert.equal(normalizePatch("> 2.0.0"), "2.0", "an author's '> 2.0.0' must not be silently dropped on resubmit");
});

test("noise around the number is ignored", () => {
  for (const raw of ["v1.36.2", "patch 1.36", "1.36 ", ">= 1.36.0", "1.36.1"]) {
    assert.equal(normalizePatch(raw), "1.36", raw);
  }
});

test("something with no version in it is null, not a guess", () => {
  for (const raw of ["latest", "", "current", null, undefined, 42, {}]) {
    assert.equal(normalizePatch(raw), null, JSON.stringify(raw));
  }
});

test("every known value normalises to itself", () => {
  for (const v of PATCH_VALUES) assert.equal(normalizePatch(v), v);
});

test("isKnownPatch accepts empty, because the field is optional", () => {
  assert.equal(isKnownPatch(""), true);
  assert.equal(isKnownPatch(undefined), true);
  assert.equal(isKnownPatch("3.0"), true);
  assert.equal(isKnownPatch("2.0.9"), false);
});
