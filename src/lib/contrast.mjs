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
