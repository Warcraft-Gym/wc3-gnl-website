"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LAST_LIST_URL_KEY } from "./RouteListUrlRecorder";

const PLAIN_LIST_HREF = "/learn/creep-routes";

/** Never notifies — neither `sessionStorage` nor `document.referrer`
 *  changes over a route page's own lifetime, so there is nothing to
 *  subscribe to; `useSyncExternalStore` is used purely for its two-snapshot
 *  shape (server vs. client), not for the subscription itself (same reason
 *  `useReducedMotion.ts`, F009, picked it over `useState`+`useEffect` —
 *  that pattern trips the repo's `react-hooks/set-state-in-effect` lint
 *  rule; this one reads a client-only value without ever calling
 *  `setState` inside an effect). */
function subscribe() {
  return () => {};
}

function getSnapshot(): string {
  // `sessionStorage` first — `RouteListUrlRecorder`'s own doc comment
  // explains why `document.referrer` alone (what F010's spec names) never
  // actually fires for the real click-through this feature targets: a
  // `next/link` navigation never sets it.
  try {
    const stored = sessionStorage.getItem(LAST_LIST_URL_KEY);
    if (stored && (stored === PLAIN_LIST_HREF || stored.startsWith(`${PLAIN_LIST_HREF}?`))) {
      return stored;
    }
  } catch {
    // Storage disabled/unavailable — fall through to document.referrer.
  }

  const ref = document.referrer;
  if (ref) {
    try {
      const url = new URL(ref);
      if (url.origin === window.location.origin && url.pathname === PLAIN_LIST_HREF) {
        return url.pathname + url.search;
      }
    } catch {
      // Malformed referrer — fall through to the plain-list default below.
    }
  }

  return PLAIN_LIST_HREF;
}

function getServerSnapshot(): string {
  return PLAIN_LIST_HREF;
}

/**
 * The route page's "All creep routes" link. Following a route from a
 * filtered `/learn/creep-routes?race=human&...` list used to always land
 * back on the *unfiltered* list (gaps.md #4) — this reads the filtered URL
 * `RouteListUrlRecorder` last stored (or, failing that, `document.referrer`)
 * and, when it names the list page on this same origin, returns to that
 * exact filtered URL instead. No prior list visit in this tab and no
 * matching referrer (a bookmark, a different site, a fresh tab) falls back
 * to the plain list, same as before.
 */
export function RouteBackLink() {
  const href = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
    >
      <ArrowLeft size={15} /> All creep routes
    </Link>
  );
}
