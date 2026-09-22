"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CampCardTrigger, MapCamp } from "@/lib/creep-routes/types";

/** Pointer-enter on a camp marker opens the card after this delay (F012a
 *  spec item 1) — long enough that a pointer passing over a marker on its
 *  way elsewhere doesn't pop a card, short enough to feel responsive. */
export const HOVER_OPEN_DELAY_MS = 120;

/** Pointer-leave (from the marker *or* the card itself) closes an unpinned
 *  card after this delay unless cancelled first — by re-entering the
 *  marker, entering the card, or the card being pinned in the meantime. */
export const HOVER_CLOSE_DELAY_MS = 180;

export type CampCardState = { camp: MapCamp; trigger: CampCardTrigger; pinned: boolean } | null;

/**
 * Owns the F012a hover/pin state machine for one `CampCard`, shared by the
 * route page (`CreepMapPlayground`) and the editor (`RouteSubmitForm`) —
 * both already own the card's open/closed state for F012, this just adds
 * the timers and the pinned/unpinned distinction on top.
 *
 * - `hoverEnter`/`hoverLeave`: pointer-enter/leave on a camp marker (or the
 *   card itself, or the map's arrow-key walk — all three "behave like
 *   hover" per the spec). Opens/closes **unpinned**, after
 *   `HOVER_OPEN_DELAY_MS`/`HOVER_CLOSE_DELAY_MS`; both no-op once a card is
 *   pinned (a pinned card only changes via `pin`/`close`, never hover).
 * - `cancelHoverLeave`: cancels a pending close — the card's own
 *   `onPointerEnter` calls this, so moving the pointer from the marker into
 *   the card itself keeps it open (spec item 1).
 * - `pin`: a click (route page), right-click/ⓘ (editor) or Enter/Space on a
 *   focused trigger — sets `pinned: true`, cancels any pending timer. One
 *   card at a time: pinning a different camp swaps it, same as hover.
 * - `close`: Escape, the ✕, an outside click, or pinning a different camp —
 *   clears the card and returns focus to whatever last opened it.
 *
 * `card?.camp.id` is exposed as `openCampId` so every trigger (a marker, a
 * table row, a stop row's ⓘ) can set `aria-expanded` regardless of which
 * layer opened the card.
 */
export function useCampCard() {
  const [card, setCard] = useState<CampCardState>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastTriggerRef = useRef<CampCardTrigger | null>(null);
  // A ref, not a `card` dependency: `hoverEnter`/`hoverLeave` stay
  // referentially stable across renders (they feed `CreepMap`'s delegated
  // pointer handlers and `CampMarker`'s `React.memo`) while still reading
  // the *current* pinned state at call time, not a stale closure.
  const pinnedRef = useRef(false);

  useEffect(() => {
    pinnedRef.current = card?.pinned ?? false;
  }, [card]);

  const clearOpenTimer = () => {
    if (openTimer.current != null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = undefined;
    }
  };
  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  };

  const hoverEnter = useCallback((camp: MapCamp, el: CampCardTrigger) => {
    if (pinnedRef.current) return;
    clearCloseTimer();
    clearOpenTimer();
    openTimer.current = window.setTimeout(() => {
      openTimer.current = undefined;
      lastTriggerRef.current = el;
      setCard((c) => (c?.pinned ? c : { camp, trigger: el, pinned: false }));
    }, HOVER_OPEN_DELAY_MS);
  }, []);

  const hoverLeave = useCallback(() => {
    if (pinnedRef.current) return;
    clearOpenTimer();
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = undefined;
      setCard((c) => (c && !c.pinned ? null : c));
    }, HOVER_CLOSE_DELAY_MS);
  }, []);

  const cancelHoverLeave = useCallback(() => {
    clearCloseTimer();
  }, []);

  const pin = useCallback((camp: MapCamp, el: CampCardTrigger) => {
    clearOpenTimer();
    clearCloseTimer();
    lastTriggerRef.current = el;
    setCard({ camp, trigger: el, pinned: true });
  }, []);

  const close = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setCard(null);
    lastTriggerRef.current?.focus();
  }, []);

  // Belt-and-braces: clears any pending timer if the owning component
  // unmounts mid-delay (e.g. navigating away right after a hover).
  useEffect(() => () => {
    clearOpenTimer();
    clearCloseTimer();
  }, []);

  return { card, openCampId: card?.camp.id ?? null, hoverEnter, hoverLeave, cancelHoverLeave, pin, close };
}
