/**
 * The design tokens that have to clear a contrast threshold, checked against
 * the stylesheet rather than against a copy of the values.
 *
 * This exists because `--wg-line` was `oklch(70% 0.03 75 / 0.18)` for months:
 * a light warm colour at 18% opacity, which flattens to a 1.3:1 hairline on
 * the panel it sits on. Nothing failed, because nothing looked. It was found
 * by eye during a redesign, fixed to a neutral grey, and then warmed to
 * #665C4E at the same lightness so it matches the palette without losing the
 * ratio.
 *
 * Reading the CSS is the point: a test holding its own copy of the colour
 * would still pass after someone changed the stylesheet.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NON_TEXT_MINIMUM, contrastRatio, parseColor, parseHex } from "./contrast.mjs";

const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../app/globals.css"), "utf8");

/** The `:root` value of a custom property, as written. */
function token(name) {
  const m = CSS.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(m, `--${name} is not defined in globals.css`);
  return m[1].trim().replace(/\s*\/\*.*$/, "").trim();
}

test("the panel border clears 3:1 on both backgrounds it sits on", () => {
  // If this fails after a palette change, the border is decorative to the
  // person who changed it and invisible to someone else. Pick a different
  // colour rather than lowering the threshold.
  const line = parseHex(token("wg-line"));
  for (const bg of ["wg-bg", "wg-surface"]) {
    const ratio = contrastRatio(line, parseColor(token(bg)));
    assert.ok(
      ratio >= NON_TEXT_MINIMUM,
      `--wg-line on --${bg} is ${ratio.toFixed(2)}:1, needs ${NON_TEXT_MINIMUM}:1 (WCAG 1.4.11)`,
    );
  }
});

test("the border is opaque, so the measured ratio is the one you see", () => {
  // A translucent border flattens against whatever is behind it, so the
  // number above would only hold for the two backgrounds tested and would
  // quietly be wrong over artwork. Keeping it opaque keeps the test honest.
  const line = token("wg-line");
  assert.doesNotThrow(() => parseHex(line), `--wg-line is "${line}"; keep it an opaque hex so contrast is measurable`);
});

test("the backgrounds it is measured against are still the ones in use", () => {
  // Guards the test itself: if these stop being a colour this file can
  // read, the assertions above would throw rather than silently measure the
  // wrong thing. hex and oklch are both real values in this stylesheet.
  for (const bg of ["wg-bg", "wg-surface"]) assert.doesNotThrow(() => parseColor(token(bg)), bg);
});

test("the faint border stays on the floating chrome and nowhere else", () => {
  // `--wg-line-soft` is the very value this file was written to get rid of:
  // 1.3:1 on the panel. It is allowed back only for the header and sub-nav
  // pills, whose edge is decorative because the blur and shadow already
  // separate them from the page. Anywhere a reader needs to see a boundary
  // (tables, cards, inputs, controls) it is the old bug again, so the
  // allowlist is the enforcement and this test is the reason it holds.
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const allowed = new Set(
    ["SiteHeader", "LearnSubNav", "GnlSubNav", "MobileNav"].map((n) => `components/layout/${n}.tsx`),
  );
  const offenders = globSync("**/*.{ts,tsx,mjs,css}", { cwd: root })
    .filter((f) => !f.endsWith(".test.mjs") && f !== "app/globals.css")
    .filter((f) => /border-line-soft|--wg-line-soft/.test(readFileSync(join(root, f), "utf8")))
    .filter((f) => !allowed.has(f));
  assert.deepEqual(
    offenders,
    [],
    `border-line-soft is a 1.3:1 hairline; these are not floating chrome: ${offenders.join(", ")}`,
  );
});
