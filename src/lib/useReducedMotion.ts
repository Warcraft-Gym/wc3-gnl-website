"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

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
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
