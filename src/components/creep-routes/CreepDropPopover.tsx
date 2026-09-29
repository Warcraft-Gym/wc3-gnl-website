"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { dropKey, dropSetLabel } from "@/lib/creep-routes/camp-label.mjs";
import { creepXp } from "@/lib/creep-routes/xp.mjs";
import type { MapCamp, MapCampCreep } from "@/lib/creep-routes/types";
import { HOVER_OPEN_DELAY_MS } from "./useCampCard";
import { CampIcon } from "./CampIcon";
import { DropDiamond } from "./DropDiamond";

const WIDTH = 288; // 18rem

/** Same gate as the camp card: hover opens only with a fine pointer at >= 768px. */
function canHover() {
  return window.matchMedia("(hover: hover)").matches && window.matchMedia("(min-width: 768px)").matches;
}

/** Places the fixed popover `box` from its portrait `anchor`: below it, or
 *  above when it would pass the viewport bottom, clamped 8px inside the
 *  viewport. The box hugs its content up to 18rem. */
function placeFixed(box: HTMLElement, anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const M = 8;
  box.style.maxWidth = `${Math.min(WIDTH, vw - 2 * M)}px`;
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  const left = Math.min(Math.max(r.left, M), vw - M - w);
  let top = r.bottom + M;
  if (top + h > vh - M) top = r.top - M - h;
  top = Math.min(Math.max(top, M), Math.max(M, vh - M - h));
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.visibility = "visible";
}

/** One creep: a header line "Name · Lv N · N base xp", then one row per drop set it carries. */
export function CreepDropPopover({
  creep,
  camp,
  pinned,
  onClose,
  anchorRef,
  boxRef,
  id,
}: {
  creep: MapCampCreep;
  camp: MapCamp;
  pinned: boolean;
  onClose: () => void;
  /** The portrait the popover hangs from. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Receives the popover element, so the caller can tell inside from outside clicks. */
  boxRef: React.RefObject<HTMLDivElement | null>;
  id: string;
}) {
  // Portalled to <body> and fixed, so no sibling panel can paint over it; re-placed on scroll and resize.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const anchor = anchorRef.current;
    if (!box || !anchor) return;
    const update = () => placeFixed(box, anchor);
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, boxRef]);
  return createPortal(
    <div
      ref={boxRef}
      id={id}
      role={pinned ? "dialog" : "tooltip"}
      aria-label={pinned ? `${creep.name} details` : undefined}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" && pinned) onClose();
      }}
      style={{ position: "fixed", left: 0, top: 0, visibility: "hidden" }}
      className="z-50 w-max cursor-auto rounded-md border border-line-strong bg-surface p-2.5 text-left shadow-[0_12px_32px_-8px_rgba(0,0,0,.9)]"
    >
      <p className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-[0.85rem] font-medium text-fg">{creep.name}</span>
        <span className="tnum text-[0.75rem] text-muted">
          · Lv {creep.level} · {creepXp(creep.level)} base xp
        </span>
        {pinned ? (
          <button type="button" onClick={onClose} aria-label={`Close ${creep.name} details`} className="ml-auto grid size-4 shrink-0 place-items-center rounded text-muted hover:text-gold">
            <X size={14} />
          </button>
        ) : null}
      </p>
      {creep.drops?.length ? (
        <ul className="mt-1.5 space-y-1.5">
          {creep.drops.map((d, i) => {
            const pool = camp.drops?.find((c) => dropKey(c) === dropKey(d));
            return (
              <li key={i}>
                <p className="flex items-center gap-1 text-[0.75rem] text-muted">
                  <DropDiamond drop={d} className="size-2" />
                  {dropSetLabel(pool ?? d)}
                  {d.chance < 100 ? <span className="tnum text-faint">({d.chance}% chance)</span> : null}
                </p>
                {pool?.items.length ? (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {pool.items.map((it) => (
                      <CampIcon key={it.id} iconKey={it.icon} title={it.name} kind="item" size={22} />
                    ))}
                  </span>
                ) : (
                  <p className="mt-1 text-[0.75rem] text-faint">Unresolved pool</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>,
    document.body,
  );
}

/**
 * A chain portrait that shows `CreepDropPopover` for its creep (any creep):
 * on hover (fine pointer, >= 768px) after ~120ms, and, when `clickable`, on
 * click or tap, pinned until clicked again, closed, Escape or a pointerdown
 * outside it. The pin is owned by the caller (`pinned`/`onPinnedChange`) so
 * one chain has at most one pinned popover. Clicks never reach the stop.
 */
export function DropPortrait({
  creep,
  camp,
  clickable,
  pinned = false,
  onPinnedChange,
  children,
}: {
  creep: MapCampCreep;
  camp: MapCamp;
  clickable: boolean;
  pinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const mode = pinned ? "pin" : hovered ? "hover" : null;
  const ref = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onPinnedChange?.(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !box.current?.contains(t)) onPinnedChange?.(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [pinned, onPinnedChange]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);


  // Closing a pinned popover hands focus back to the portrait that opened it.
  const close = () => {
    onPinnedChange?.(false);
    button.current?.focus();
  };
  const popover = mode ? (
    <CreepDropPopover creep={creep} camp={camp} pinned={mode === "pin"} onClose={close} anchorRef={ref} boxRef={box} id={id} />
  ) : null;

  return (
    <span
      ref={ref}
      className="relative block"
      onPointerEnter={() => {
        if (mode || !canHover()) return;
        timer.current = setTimeout(() => setHovered(true), HOVER_OPEN_DELAY_MS);
      }}
      onPointerLeave={() => {
        if (timer.current) clearTimeout(timer.current);
        setHovered(false);
      }}
    >
      {clickable ? (
        <button
          ref={button}
          type="button"
          aria-label={`${creep.name} details`}
          aria-expanded={mode === "pin"}
          aria-controls={mode ? id : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (timer.current) clearTimeout(timer.current);
            setHovered(false);
            onPinnedChange?.(!pinned);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="relative block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          {children}
        </button>
      ) : (
        children
      )}
      {popover}
    </span>
  );
}
