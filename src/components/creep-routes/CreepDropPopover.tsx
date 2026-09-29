"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

/** Under the icon, 18rem wide, right-aligned when it would pass the stops
 *  panel's right edge; on a phone, the chain's full width. */
function placement(el: HTMLElement): CSSProperties {
  const r = el.getBoundingClientRect();
  const chain = el.closest("ol") ?? el;
  if (window.innerWidth < 640) {
    const c = chain.getBoundingClientRect();
    return { left: c.left - r.left, width: c.width };
  }
  const bound = (el.closest(".panel") ?? chain).getBoundingClientRect();
  return r.left + WIDTH > bound.right - 8 ? { right: 0, width: WIDTH } : { left: 0, width: WIDTH };
}

/** What one creep drops: its name, level and base XP, then one row per drop set. */
export function CreepDropPopover({
  creep,
  camp,
  pinned,
  onClose,
  style,
  id,
}: {
  creep: MapCampCreep;
  camp: MapCamp;
  pinned: boolean;
  onClose: () => void;
  style: CSSProperties;
  id: string;
}) {
  return (
    <div
      id={id}
      role={pinned ? "dialog" : "tooltip"}
      aria-label={pinned ? `${creep.name} item drops` : undefined}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" && pinned) onClose();
      }}
      style={style}
      className="absolute top-full z-40 mt-2 cursor-auto rounded border border-line-strong bg-surface p-3 text-left shadow-[0_12px_32px_-8px_rgba(0,0,0,.9)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-fg">{creep.name}</p>
          <p className="tnum text-[0.75rem] text-muted">
            Lv {creep.level} · {creepXp(creep.level)} xp
          </p>
        </div>
        {pinned ? (
          <button type="button" onClick={onClose} aria-label="Close item drops" className="grid size-6 shrink-0 place-items-center rounded text-muted hover:text-gold">
            <X size={16} />
          </button>
        ) : null}
      </div>
      <ul className="mt-2 space-y-2">
        {(creep.drops ?? []).map((d, i) => {
          const pool = camp.drops?.find((c) => dropKey(c) === dropKey(d));
          return (
            <li key={i} className="border-t border-line/60 pt-2">
              <p className="flex items-center gap-2 text-[0.8rem] text-muted">
                <DropDiamond drop={d} />
                {dropSetLabel(pool ?? d)}
                {d.chance < 100 ? <span className="tnum text-faint">({d.chance}% chance)</span> : null}
              </p>
              {pool?.items.length ? (
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {pool.items.map((it) => (
                    <CampIcon key={it.id} iconKey={it.icon} title={it.name} kind="item" size={26} />
                  ))}
                </span>
              ) : (
                <p className="mt-1 text-[0.75rem] text-faint">Unresolved pool</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * A chain portrait that shows `CreepDropPopover` for a creep carrying drops:
 * on hover (fine pointer, >= 768px) after ~120ms, and, when `clickable`, on
 * click or tap, pinned until clicked again, closed or Escape. Clicks never
 * reach the stop block, so the portrait does not open the camp card.
 */
export function DropPortrait({
  creep,
  camp,
  clickable,
  children,
}: {
  creep: MapCampCreep;
  camp: MapCamp;
  clickable: boolean;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<null | "hover" | "pin">(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const ref = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  useEffect(() => {
    if (mode !== "pin") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMode(null);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!creep.drops?.length) return <span className="relative block">{children}</span>;

  const open = (next: "hover" | "pin") => {
    if (ref.current) setStyle(placement(ref.current));
    setMode(next);
  };
  // Closing a pinned popover hands focus back to the portrait that opened it.
  const close = () => {
    setMode(null);
    button.current?.focus();
  };
  const popover = mode ? (
    <CreepDropPopover creep={creep} camp={camp} pinned={mode === "pin"} onClose={close} style={style} id={id} />
  ) : null;

  return (
    <span
      ref={ref}
      className="relative block"
      onPointerEnter={() => {
        if (mode || !canHover()) return;
        timer.current = setTimeout(() => open("hover"), HOVER_OPEN_DELAY_MS);
      }}
      onPointerLeave={() => {
        if (timer.current) clearTimeout(timer.current);
        setMode((m) => (m === "hover" ? null : m));
      }}
    >
      {clickable ? (
        <button
          ref={button}
          type="button"
          aria-label={`${creep.name} item drops`}
          aria-expanded={mode === "pin"}
          aria-controls={mode ? id : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (timer.current) clearTimeout(timer.current);
            if (mode === "pin") setMode(null);
            else open("pin");
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
