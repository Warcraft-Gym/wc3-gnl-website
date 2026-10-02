// Polyfills jsdom is missing that the site's components reach for, plus the
// `toBeInTheDocument()`-style matchers component tests use. Scoped to the
// `src/components/**/*.test.tsx` project (see `vitest.config.ts`'s
// `environmentMatchGlobs`) — the `src/lib/replay` suite runs in plain
// `node` and never touches `window` or renders anything.
import "@testing-library/jest-dom/vitest";

if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView !== "function") {
  // jsdom implements no layout, so `scrollIntoView` (used by the submit
  // forms' "Submit another" focus-and-scroll, F009) is simply absent.
  Element.prototype.scrollIntoView = () => {};
}

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  // `useReducedMotion` (src/lib/useReducedMotion.ts) reads
  // `window.matchMedia("(prefers-reduced-motion: reduce)")` on every
  // render via `useSyncExternalStore`; jsdom has no real implementation.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
