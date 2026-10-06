"use client";

import { useSyncExternalStore } from "react";

const subscribe = (query: string) => (onChange: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(query);
  mq.addEventListener?.("change", onChange);
  return () => mq.removeEventListener?.("change", onChange);
};
const subscribers = new Map<string, (onChange: () => void) => () => void>();

// No `window` on the server; `false` matches most users and is corrected
// the moment the client subscribes — `useSyncExternalStore` re-renders
// with the real value right after hydration, never during it.
function getServerSnapshot() {
  return false;
}

/**
 * Tracks `prefers-reduced-motion: reduce`, live — flips immediately if the
 * OS setting (or a Playwright `emulateMedia`) changes while the page is
 * open. `useSyncExternalStore`, not `useState`/`useEffect`: reading
 * `matchMedia` and calling `setState` synchronously inside an effect body
 * is exactly the "you might not need an effect" case React's own lint rule
 * (`react-hooks/set-state-in-effect`) flags — this is the API built for
 * subscribing to an external, already-synchronous source like a media
 * query, with no client-only round-trip render.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** Tracks any media query, live, the same way; false on the server. */
export function useMediaQuery(query: string): boolean {
  if (!subscribers.has(query)) subscribers.set(query, subscribe(query));
  return useSyncExternalStore(subscribers.get(query)!, () => Boolean(window.matchMedia?.(query).matches), getServerSnapshot);
}
