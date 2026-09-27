import { test } from "node:test";
import assert from "node:assert/strict";
import { compositeOver, contrastRatio, parseHex, relativeLuminance } from "./contrast.mjs";

const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;

test("the known extremes come out right", () => {
  assert.ok(near(contrastRatio(parseHex("#000"), parseHex("#fff")), 21));
  assert.equal(contrastRatio(parseHex("#777"), parseHex("#777")), 1);
});

test("agrees with WCAG's own worked examples", () => {
  // #767676 on white is the canonical "just passes 4.5:1" grey.
  assert.ok(near(contrastRatio(parseHex("#767676"), parseHex("#ffffff")), 4.54, 0.02));
  // #595959 on white is the 7:1 AAA example.
  assert.ok(near(contrastRatio(parseHex("#595959"), parseHex("#ffffff")), 7.0, 0.05));
});

test("order does not change the ratio", () => {
  const a = parseHex("#123456"), b = parseHex("#abcdef");
  assert.equal(contrastRatio(a, b), contrastRatio(b, a));
});

test("luminance is ordered the way eyes are", () => {
  assert.ok(relativeLuminance(parseHex("#ffffff")) > relativeLuminance(parseHex("#808080")));
  assert.ok(relativeLuminance(parseHex("#00ff00")) > relativeLuminance(parseHex("#0000ff")), "green reads brighter than blue");
});

test("short hex expands", () => {
  assert.deepEqual(parseHex("#abc"), parseHex("#aabbcc"));
});

test("a colour it cannot read throws, rather than passing quietly", () => {
  for (const bad of ["oklch(70% 0.03 75)", "rgb(1,2,3)", "", "#12345", "nonsense", null]) {
    assert.throws(() => parseHex(bad), /not a hex colour/, String(bad));
  }
});

test("compositing a translucent colour matches what the eye sees", () => {
  const white = parseHex("#ffffff"), black = parseHex("#000000");
  assert.deepEqual(compositeOver(white, black, 1), white);
  assert.deepEqual(compositeOver(white, black, 0), black);
  assert.deepEqual(compositeOver(white, black, 0.5), [128, 128, 128]);
});

test("a faint line over a dark panel is measured flattened, not at full strength", () => {
  // The old --wg-line was a light warm colour at 18%: bright in isolation,
  // nearly invisible once composited. Measuring it unflattened would have
  // said it passed.
  const line = parseHex("#b5a592"), panel = parseHex("#0C0805");
  assert.ok(contrastRatio(line, panel) > 8, "at full strength it looks fine");
  assert.ok(contrastRatio(compositeOver(line, panel, 0.18), panel) < 1.5, "flattened, it is a hairline");
});
