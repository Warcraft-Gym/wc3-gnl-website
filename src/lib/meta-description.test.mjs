import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_DESCRIPTION, metaDescription } from "./meta-description.mjs";

test("collapses the line breaks authors type into summaries", () => {
  const real = "You start with lightning shield creep \r\n-> go into rogue camp for level 2, keep producing archers, t2";
  const out = metaDescription(real);
  assert.ok(!/[\r\n]/.test(out), "no raw newlines reach the meta tag");
  assert.ok(!/ {2}/.test(out), "no double spaces");
  assert.ok(out.startsWith("You start with lightning shield creep -> go into rogue camp"));
});

test("short text is returned unchanged", () => {
  assert.equal(metaDescription("A short summary."), "A short summary.");
});

test("long text is cut at a word boundary, never mid-word", () => {
  const out = metaDescription("word ".repeat(80));
  assert.ok(out.length <= MAX_DESCRIPTION, `${out.length} chars`);
  assert.ok(out.endsWith("…"));
  assert.ok(!/\bwor…$/.test(out), "did not cut inside a word");
});

test("trailing punctuation is not left dangling before the ellipsis", () => {
  const out = metaDescription(`${"a".repeat(150)}, and then some more text here`);
  assert.ok(!out.includes(",…"));
});

test("a single very long word still gets cut rather than overflowing", () => {
  const out = metaDescription("x".repeat(400));
  assert.ok(out.length <= MAX_DESCRIPTION, `${out.length} chars`);
});

test("empty or non-string input is undefined, so the field is simply absent", () => {
  for (const bad of ["", "   ", "\n\n", null, undefined, 42]) {
    assert.equal(metaDescription(bad), undefined, JSON.stringify(bad));
  }
});
