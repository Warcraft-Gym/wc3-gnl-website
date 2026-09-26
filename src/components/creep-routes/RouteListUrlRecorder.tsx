"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** `sessionStorage` key `RouteBackLink` reads — see its own doc comment for
 *  why this exists alongside `document.referrer`. */
export const LAST_LIST_URL_KEY = "creep-routes:last-list-url";

/**
 * Mounted on `/learn/creep-routes` only: records the list's current URL
 * (with whatever filters are active) to `sessionStorage` every time it
 * changes, so `RouteBackLink` on a route detail page can return to the
 * exact filtered view the visitor came from.
 *
 * Why not just `document.referrer` (what F010's spec names)? Verified with
 * Playwright: a `next/link` click is a client-side transition (History API
 * `pushState`), and a real browser only ever sets `document.referrer` on an
 * *actual* navigation (a full page load) — it stays empty across every
 * client-side route change in this app, which is exactly how a visitor
 * gets from the filtered list to a route page in normal use. A
 * `document.referrer`-only implementation would pass a same-tab manual
 * test that force-reloads between pages, but silently never work for a
 * real click-through — this component (plus `RouteBackLink`'s
 * `sessionStorage`-first read) is what makes the required behaviour
 * ("filter → open route → back link → filtered list", contract's
 * behavioural check) actually hold; `document.referrer` stays as a
 * secondary fallback in `RouteBackLink` for a hard navigation (an
 * external link, a fresh tab) `sessionStorage` wouldn't cover.
 */
export function RouteListUrlRecorder() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    try {
      sessionStorage.setItem(LAST_LIST_URL_KEY, qs ? `${pathname}?${qs}` : pathname);
    } catch {
      // Storage disabled/unavailable (private mode, quota) — RouteBackLink
      // falls back to document.referrer, then the plain list.
    }
  }, [pathname, searchParams]);

  return null;
}
