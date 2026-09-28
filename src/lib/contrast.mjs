/** WCAG contrast maths, for asserting design tokens in tests.
 *
 * Borders and other non-text UI need 3:1 against what they sit on (WCAG
 * 2.2, 1.4.11). Nothing checked that here, which is how the panel border
 * came to be a 1.3:1 hairline: it was legible to whoever picked it, on a
 * good screen, and no test disagreed.
 */

/** WCAG 2.2 1.4.11: non-text contrast, for borders, icons and controls. */
export const NON_TEXT_MINIMUM = 3;
/** WCAG 2.2 1.4.3: normal body text. */
export const TEXT_MINIMUM = 4.5;

/** `#rgb` or `#rrggbb` to `[r, g, b]`. Throws on anything else, rather than
 *  returning a default that would make a test quietly pass. */
export function parseHex(value) {
  const hex = String(value).trim().replace(/^#/, "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a hex colour: ${value}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** Relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, 1 to 21. Order does not matter. */
export function contrastRatio(a, b) {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** A translucent colour flattened onto a background, which is what the eye
 *  actually sees and what the ratio has to be measured against. */
export function compositeOver(fg, bg, alpha) {
  return fg.map((f, i) => Math.round(f * alpha + bg[i] * (1 - alpha)));
}

/* --- oklch ---------------------------------------------------------------
 *
 * The palette is written in oklch as well as hex, so a test that only spoke
 * hex could not measure half of it. Conversion is Björn Ottosson's oklab
 * matrices: oklch to oklab, oklab to linear sRGB, then encoded to the 0-255
 * sRGB that `relativeLuminance` expects. Going back through the encode keeps
 * one luminance path rather than two that could disagree.
 */

const encode = (x) => {
  const c = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};

/** `oklch(L C H)` or `oklch(L C H / a)` to `[r, g, b]`. Alpha is ignored:
 *  use `alphaOf` and `compositeOver` to flatten it deliberately. */
export function parseOklch(value) {
  const m = String(value)
    .trim()
    .match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
  if (!m) throw new Error(`not an oklch colour: ${value}`);
  const L = m[2] ? Number(m[1]) / 100 : Number(m[1]);
  const C = Number(m[3]);
  const h = (Number(m[4]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ].map(encode);
}

/** Any colour the stylesheet actually uses. Throws on anything it cannot
 *  measure, so an unreadable token fails the test rather than skipping it. */
export function parseColor(value) {
  return String(value).trim().toLowerCase().startsWith("oklch(") ? parseOklch(value) : parseHex(value);
}

/** The alpha of a colour, 1 when it is opaque. */
export function alphaOf(value) {
  const m = String(value).match(/\/\s*([\d.]+)\s*\)$/);
  return m ? Number(m[1]) : 1;
}
