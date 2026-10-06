"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** The edge of the shown path's panel, hanging from its tab: an absolute box behind the panel's rows. */
export const PANEL_EDGE = "pointer-events-none absolute inset-y-0 left-[50px] right-2 rounded-b border border-t-0 border-arcane/55 bg-arcane/[0.05]";

const TAB =
  "inline-flex h-9 max-w-[13.5rem] flex-none items-center gap-[7px] rounded-t border border-b-0 pl-[9px] pr-3 text-[0.86rem] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold";

/**
 * The tab strip of a "Choose one path" block, one look in the builder and for the
 * reader: one tab per path, a letter disc then the path's name ("Path B" when it
 * has none), all in `arcane`; the letter tells the paths apart. The shown tab has
 * no bottom edge, so it opens into its panel (`PANEL_EDGE`). Arrow keys move
 * along the strip; on a narrow screen it scrolls sideways inside itself.
 */
export function PathTabs({
  labels,
  shown,
  onShow,
  tabId,
  panelId,
  onAdd,
  after,
  name = "Paths",
  className,
}: {
  labels: string[];
  shown: number;
  onShow: (arm: number) => void;
  tabId: (arm: number) => string;
  panelId: string;
  /** The builder's ghost tab "+ Path"; absent at the path cap and for the reader. */
  onAdd?: () => void;
  /** Something after a tab's name (the reader's level). */
  after?: (arm: number) => React.ReactNode;
  /** The tablist's name: "Paths" in the builder, the block's kind for the reader. */
  name?: string;
  className?: string;
}) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, a: number) => {
    const last = labels.length - 1;
    const next = e.key === "ArrowRight" ? (a === last ? 0 : a + 1) : e.key === "ArrowLeft" ? (a === 0 ? last : a - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    onShow(next);
    tabs.current[next]?.focus();
  };
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pt-[3px] shadow-[inset_0_-1px_0_color-mix(in_oklab,var(--wg-arcane)_55%,transparent)]", className)}>
      <div role="tablist" aria-label={name} className="flex gap-1.5">
        {labels.map((label, a) => {
          const on = a === shown;
          const letter = "ABC"[a];
          const name = label.trim();
          return (
            <button
              key={a}
              ref={(el) => {
                tabs.current[a] = el;
              }}
              id={tabId(a)}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={on ? panelId : undefined}
              tabIndex={on ? 0 : -1}
              title={name || undefined}
              onClick={() => onShow(a)}
              onKeyDown={(e) => onKey(e, a)}
              className={cn(
                TAB,
                on
                  ? "border-arcane border-t-[3px] bg-[color-mix(in_oklab,var(--wg-arcane)_22%,#000)]"
                  : "border-arcane/45 bg-[color-mix(in_oklab,var(--wg-arcane)_7%,#000)] hover:bg-[color-mix(in_oklab,var(--wg-arcane)_14%,#000)]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-[18px] flex-none place-items-center rounded-full border border-arcane text-[0.68rem] font-bold leading-none",
                  on ? "bg-arcane text-black" : "text-arcane",
                )}
              >
                {letter}
              </span>
              <span className={cn("min-w-0 max-w-[16ch] truncate", name && on ? "font-bold text-fg" : "text-muted")}>{name || `Path ${letter}`}</span>
              {after?.(a)}
            </button>
          );
        })}
      </div>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add path"
          className="inline-flex h-9 flex-none items-center gap-1 rounded-t border border-b-0 border-dashed border-line-strong px-2.5 text-[0.86rem] text-muted hover:text-gold"
        >
          <Plus aria-hidden size={13} /> Path
        </button>
      ) : null}
    </div>
  );
}
