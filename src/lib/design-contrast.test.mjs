/**
 * What has to stay legible, checked against the stylesheet rather than
 * against a copy of the values.
 *
 * History, because this token has moved three times. `--wg-line` was
 * `oklch(70% 0.03 75 / 0.18)`, which flattens to about 1.3:1 on the panel.
 * It was raised to an opaque grey and then to `#665C4E` to clear the 3:1
 * that WCAG 2.2 1.4.11 asks of a border carrying meaning. At that strength
 * the site read as a grid of boxed-in slabs, and the maintainer chose the
 * faint hairline back, knowingly.
 *
 * That is a legitimate reading rather than a regression: 1.4.11 covers
 * visual information *required* to identify a component. These panels are
 * identified by their fill against the ground, their contents and their
 * heading, not by their edge, so the edge is ornament. What a reader does
 * need is the focus ring, and that is what this file now guards.
 *
 * There is a real cost, recorded so nobody rediscovers it by surprise: ten
 * form controls take the same hairline, and a border is the usual way to see
 * where an input begins. They rely on their fill and their focus ring
 * instead. If that proves too subtle in use, give controls their own token
 * rather than raising `--wg-line` and returning the whole site to slabs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NON_TEXT_MINIMUM, contrastRatio, parseColor } from "./contrast.mjs";

const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../app/globals.css"), "utf8");

/** The `:root` value of a custom property, as written. */
function token(name) {
  const m = CSS.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(m, `--${name} is not defined in globals.css`);
  return m[1].trim().replace(/\s*\/\*.*$/, "").trim();
}

test("the focus ring clears 3:1 on the ground and on the panel", () => {
  // With the border decorative, this is the one thing that tells a keyboard
  // user where they are. It is not allowed to become subtle too.
  const ring = parseColor(token("wg-gold"));
  for (const bg of ["wg-bg", "wg-surface"]) {
    const ratio = contrastRatio(ring, parseColor(token(bg)));
    assert.ok(
      ratio >= NON_TEXT_MINIMUM,
      `the focus ring on --${bg} is ${ratio.toFixed(2)}:1, needs ${NON_TEXT_MINIMUM}:1 (WCAG 1.4.11)`,
    );
  }
});

test("the focus ring is actually applied, and is not hidden", () => {
  // A ring that clears 3:1 in the palette but is never drawn helps nobody.
  const m = CSS.match(/:focus-visible\s*\{([^}]*)\}/);
  assert.ok(m, "no :focus-visible rule in globals.css");
  assert.match(m[1], /outline:[^;]*var\(--wg-gold\)/, ":focus-visible must draw the gold outline");
  assert.doesNotMatch(m[1], /outline:\s*(none|0)/, ":focus-visible must not remove the outline");
});

test("the panel hairline is still the deliberate translucent one", () => {
  // Not a contrast assertion: it is a note that the faint border is a choice.
  // If someone raises it to an opaque colour they should read the header of
  // this file first, because that was tried twice and reverted twice.
  const line = token("wg-line");
  assert.match(line, /\/\s*0?\.\d+\s*\)$/, `--wg-line is "${line}"; the decorative hairline is translucent by choice`);
});

test("the colours measured here are ones this file can read", () => {
  // Guards the test itself: these must stay parseable or the assertions
  // above would throw rather than silently measure the wrong thing.
  for (const name of ["wg-bg", "wg-surface", "wg-gold"]) {
    assert.doesNotThrow(() => parseColor(token(name)), name);
  }
});
