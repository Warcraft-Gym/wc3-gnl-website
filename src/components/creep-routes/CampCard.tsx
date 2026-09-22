"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CampCardTrigger, MapCamp, MapCampDrop } from "@/lib/creep-routes/types";
import { campSpotTitle, dropSetLabel } from "@/lib/creep-routes/camp-label.mjs";
import { creepXp } from "@/lib/creep-routes/xp.mjs";
import { BandDot } from "./RouteBadges";
import { CampIcon } from "./CampIcon";
import { cn } from "@/lib/utils";

/** One colour per drop-set index, cycled — Liquipedia colours its Item
 *  markers per drop set (blue/red in the reference screenshot) so a reader
 *  can match a creep's marker to the matching Items row at a glance. All
 *  four are existing, already-validated design tokens (DESIGN.md's motion/
 *  colour rules only gate *new* mark colours — see C-024 — these are
 *  reused, not new), chosen for maximum contrast from one another. */
const DROP_TOKENS = ["var(--wg-arcane)", "var(--wg-loss)", "var(--wg-win)", "var(--wg-gold)"];

function DropDiamond({ index, title }: { index: number; title?: string }) {
  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      style={{ background: DROP_TOKENS[index % DROP_TOKENS.length] }}
      className="inline-block size-2.5 shrink-0 rotate-45 rounded-[1px]"
    />
  );
}

/** The `Item` column in the Creeps table only ever shows a marker when the
 *  whole camp has exactly one drop pool: `war3mapUnits.doo` records each
 *  creep's own `droppedItemSets`, but the build script (`drops.mjs`)
 *  already unions and dedupes every creep's sets into one camp-level
 *  `drops[]` before it reaches the catalogue (see the F011 handoff) — so
 *  *which* creep guards *which* multi-pool drop set is gone by the time
 *  this component sees the data. Marking every creep with the single pool
 *  a one-pool camp has is still true (it's the only thing anything here
 *  can drop); guessing an attribution for a multi-pool camp would not be —
 *  so those are left blank rather than invented. Flagged in the handoff. */
function singleDropIndex(drops: MapCampDrop[]) {
  return drops.length === 1 ? 0 : null;
}

function dropTitle(drop: MapCampDrop) {
  return drop.chance < 100 ? `${dropSetLabel(drop)} (${drop.chance}% chance)` : dropSetLabel(drop);
}

function itemTitle(name: string, chance: number) {
  return chance < 100 ? `${name} (${chance}%)` : name;
}

function focusableElements(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
  );
}

/**
 * The camp card (F012, hover/pin behaviour added in F012a): a
 * Liquipedia-style preview box for one camp — title, a Creeps table
 * (icon/name, count, level, per-creep XP, item marker) and an Items section
 * (one row per drop set: its marker, label, the possible item icons). A
 * popover anchored to `anchorEl` on >= 768px (flips/clamps to stay
 * on-screen, measured from `getBoundingClientRect()`); a full-width bottom
 * sheet under 768px. `role="dialog"`,
 * `aria-labelledby` the title, Escape and an outside click both call
 * `onClose` — the caller is expected to return focus to whatever opened the
 * card (this component only knows the anchor's position, not its focus
 * semantics, since the same card is opened from very different triggers: a
 * map marker, a table row, an editor stop's info button).
 *
 * F012a: hovering a marker opens this same card **unpinned** — a click (or
 * Enter/Space, or right-click/ⓘ in the editor) **pins** it. `pinned` drives
 * the modal-vs-non-modal split the spec asks for (C-025): pinned is a real
 * modal (`aria-modal="true"`, a focus trap, initial focus moves into it,
 * body scroll locked so it can't be scrolled behind); unpinned is
 * non-modal (`aria-modal="false"`, no focus trap, no scroll lock, the
 * page's own focus is left alone) — a hover preview must never steal focus
 * or block the page under it. `onPointerEnter`/`onPointerLeave` let the
 * caller's hover timers know when the pointer is over the card itself
 * (moving from the marker into the card keeps it open, per the spec).
 */
export function CampCard({
  camp,
  band,
  anchorEl,
  pinned,
  onClose,
  onPointerEnter,
  onPointerLeave,
  titleId,
}: {
  camp: MapCamp;
  /** Defaults to `camp.band`; accepted separately per the spec so a caller
   *  can override it (e.g. a synthetic camp without its own band). */
  band?: string;
  /** The element that opened the card — the popover anchors near it on
   *  desktop; ignored (bottom sheet, centred) below 768px. Also excluded
   *  from the outside-click close check, so clicking the trigger itself
   *  (which pins the card) never first reads as "outside". */
  anchorEl: CampCardTrigger | null;
  /** Modal (focus-trapped, scroll-locked) when pinned; a non-modal hover
   *  preview otherwise — see the component doc comment. */
  pinned: boolean;
  onClose: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  titleId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(true);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const generatedId = useId();
  const headingId = titleId ?? generatedId;
  const resolvedBand = band ?? camp.band;

  // >= 768px matches the site's own `sm:`/`md:` breakpoints for this kind
  // of "popover on desktop, sheet on mobile" split (see RouteStepTable's
  // stacked-card layout, which switches at the same width).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Two-pass placement: render once to measure the card's real size (it
  // varies with creep/drop counts), then place it clear of the anchor,
  // flipping above when it would overflow the viewport's bottom edge, and
  // clamped so it's never off-screen.
  useLayoutEffect(() => {
    // Nothing to measure/position for the mobile bottom sheet — `pos` is
    // only ever read while `isDesktop` (see the `style` below), so a stale
    // value here while it's false is harmless and never rendered.
    if (!isDesktop) return;
    const el = containerRef.current;
    if (!el || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const clear = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const overflowsBottom = rect.bottom + clear + h > vh;
    const top = overflowsBottom ? rect.top - clear - h : rect.bottom + clear;
    const left = rect.left;
    setPos({
      left: Math.min(Math.max(left, 8), Math.max(8, vw - w - 8)),
      top: Math.min(Math.max(top, 8), Math.max(8, vh - h - 8)),
    });
    // `camp.id` in deps: reposition when the card is re-opened for a
    // different camp at the same anchor (the size can change).
  }, [isDesktop, anchorEl, camp.id]);

  // Escape always closes, pinned or not (C-025: even a non-modal hover
  // preview must be dismissable from the keyboard).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Focus trap + initial focus into the card (the close button — always
  // present, always the first focusable element) — **pinned only**: an
  // unpinned hover preview must not steal focus or trap Tab (spec item 3,
  // C-025's "unpinned is not modal, does not trap focus").
  useEffect(() => {
    if (!pinned) return;
    const el = containerRef.current;
    if (!el) return;
    const items = focusableElements(el);
    (items[0] ?? el).focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !el) return;
      const focusables = focusableElements(el);
      if (!focusables.length) return;
      const idx = focusables.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          focusables[focusables.length - 1].focus();
        }
      } else if (idx === -1 || idx === focusables.length - 1) {
        e.preventDefault();
        focusables[0].focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pinned, camp.id]);

  // Outside click closes — mirrors `IconPicker`'s own popover pattern.
  // `anchorEl` (the trigger) is excluded too: clicking it is what *pins*
  // the card (the trigger's own `onClick`, fired right after this
  // `mousedown`), not a click "outside" the disclosure it owns.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const el = containerRef.current;
      const target = e.target as Node;
      if (el && !el.contains(target) && !(anchorEl && anchorEl.contains(target))) onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose, anchorEl]);

  // Body scroll lock — **pinned only**: an unpinned hover preview "must
  // not... block the page" (spec item 3), so the page must stay scrollable
  // under it. Mainly matters for the mobile bottom sheet, where the pinned
  // card itself can be taller than the viewport.
  useEffect(() => {
    if (!pinned) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pinned]);

  const hasSingleDrop = useMemo(() => singleDropIndex(camp.drops ?? []) !== null, [camp.drops]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal={pinned ? "true" : "false"}
      aria-labelledby={headingId}
      tabIndex={-1}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={cn(
        "panel z-50 w-[22rem] max-w-[calc(100vw-1rem)] border-gold/40 bg-surface/98 shadow-[0_20px_50px_-12px_rgba(0,0,0,.9)] outline-none",
        // Unpinned is a hover preview, not a click target competing with
        // whatever's under it — it still needs its own pointer-enter/leave
        // (above) to know the pointer is over it, so `pointer-events` stays
        // `auto` (the default) here too; "pointer-events on the card itself
        // only" (spec item 3) is about *not adding a backdrop that blocks
        // the rest of the page*, which this component never had.
        !isDesktop && "max-h-[85vh] w-full max-w-none rounded-b-none border-b-0",
      )}
      // `.panel` (globals.css) declares its own `position: relative` in the
      // same `@layer utilities` Tailwind's `fixed`/`inset-x-0`/`bottom-0`
      // utilities live in — equal specificity, so which one wins is a
      // source-order accident. An inline style always outranks an external
      // stylesheet rule, so position/placement is set here rather than via
      // Tailwind classes.
      style={
        isDesktop
          ? { position: "fixed", left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? "visible" : "hidden" }
          : { position: "fixed", left: 0, right: 0, bottom: 0 }
      }
    >
      <div className="flex items-center justify-between gap-3 border-b border-gold/30 px-4 py-3">
        <h2 id={headingId} className="flex items-center gap-2 font-display text-[0.95rem] font-bold uppercase tracking-[0.05em] text-fg">
          <BandDot band={resolvedBand} />
          {campSpotTitle({ ...camp, band: resolvedBand })}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camp details"
          className="grid size-7 shrink-0 place-items-center rounded text-muted hover:text-gold"
        >
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto md:max-h-[28rem]">
        <table className="w-full border-collapse text-xs">
          <caption className="border-b border-line/60 bg-surface-2/70 px-4 py-1.5 text-left font-display text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
            Creeps
          </caption>
          <thead>
            <tr className="text-left font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint">
              <th className="px-3 py-1.5 font-medium">Unit</th>
              <th className="px-2 py-1.5 text-right font-medium">Count</th>
              <th className="px-2 py-1.5 text-right font-medium">Level</th>
              <th className="px-2 py-1.5 text-right font-medium">XP</th>
              <th className="px-2 py-1.5 text-center font-medium">Item</th>
            </tr>
          </thead>
          <tbody>
            {camp.creeps.map((c, i) => (
              <tr key={i} className="border-t border-line/40">
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-2">
                    <CampIcon iconKey={c.icon} title={c.name} kind="creep" size={28} />
                    <span className="text-fg">{c.name}</span>
                  </span>
                </td>
                <td className="tnum px-2 py-1.5 text-right text-muted">{c.count}</td>
                <td className="tnum px-2 py-1.5 text-right text-muted">{c.level}</td>
                <td className="tnum px-2 py-1.5 text-right text-muted">{creepXp(c.level)}</td>
                <td className="px-2 py-1.5 text-center">
                  {hasSingleDrop ? (
                    <span className="inline-flex justify-center">
                      <DropDiamond index={0} title={dropTitle(camp.drops[0])} />
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {camp.drops?.length ? (
          <table className="w-full border-collapse text-xs">
            <caption className="border-t border-b border-line/60 bg-surface-2/70 px-4 py-1.5 text-left font-display text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
              Items
            </caption>
            <tbody>
              {camp.drops.map((drop, i) => (
                <tr key={i} className="border-t border-line/40">
                  <td className="w-6 px-3 py-2 align-middle">
                    <DropDiamond index={i} title={dropTitle(drop)} />
                  </td>
                  <td className="w-28 py-2 pr-2 align-middle text-muted">{dropSetLabel(drop)}</td>
                  <td className="py-2 pr-3 align-middle">
                    {drop.items.length ? (
                      <span className="flex flex-wrap items-center gap-1">
                        {drop.items.map((it) => (
                          <CampIcon key={it.id} iconKey={it.icon} title={itemTitle(it.name, drop.chance)} kind="item" size={26} />
                        ))}
                      </span>
                    ) : (
                      <span className="text-faint">Unresolved pool</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
