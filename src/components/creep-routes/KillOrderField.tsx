"use client";

import type { DerivedKill } from "@/lib/creep-routes/derive";
import {
  addKill,
  flatKillItems,
  joinWithPrevious,
  removeKillAt,
  splitSet,
  unorderedCreeps,
  validKills,
} from "@/lib/creep-routes/kills.mjs";
import type { MapCamp, MapCampCreep, StopKill } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { KillOrder } from "./KillOrder";

/** Optional kill order for a camp stop, drawn as the reader's chain: click
 *  a plain or greyed creep to kill it next, click a numbered step to remove
 *  it, and choose whether the creeps not in the order die after it or stay. */
export function KillOrderField({
  camp,
  kills,
  leaveRest,
  trace,
  error,
  onChange,
}: {
  camp: MapCamp;
  kills: StopKill[];
  leaveRest: boolean;
  /** This stop's `deriveRoute` kill trace. */
  trace: DerivedKill[];
  error?: string;
  onChange: (patch: { kills?: StopKill[]; leaveRest?: boolean }) => void;
}) {
  const counts = camp.creeps.map((c) => c.count);
  const valid = validKills(camp, kills) as StopKill[];
  const rows = flatKillItems(valid) as { row: number; set?: number }[];
  const rest = unorderedCreeps(camp, kills) as { creep: MapCampCreep; row: number }[];
  const leaving = rows.length > 0 && leaveRest;
  const option = "h-7 px-2 text-xs transition-colors";
  return (
    <div>
      <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">Kill order</p>
      <KillOrder
        camp={camp}
        kills={trace}
        onRemove={(i) => {
          const next = removeKillAt(valid, i);
          // An empty list means the whole camp, so "Skip the rest" goes with it.
          onChange(next.length ? { kills: next } : { kills: next, leaveRest: false });
        }}
        onJoin={(i) => onChange({ kills: joinWithPrevious(valid, i) })}
        onSplit={(i) => onChange({ kills: splitSet(valid, rows[i]?.set) })}
        skipped={leaving ? rest : []}
        onAdd={(row) => onChange({ kills: addKill(kills, row, counts) })}
      />
      {rows.length ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {rest.length ? (
            <div role="radiogroup" aria-label="The rest of the camp" className="inline-flex overflow-hidden rounded border border-line">
              {([false, true] as const).map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={leaveRest === value}
                  tabIndex={leaveRest === value ? 0 : -1}
                  onClick={() => onChange({ leaveRest: value })}
                  onKeyDown={(e) => {
                    // Arrow keys move the choice and focus to the other option, as a radio group does.
                    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
                    e.preventDefault();
                    onChange({ leaveRest: !value });
                    (e.currentTarget.parentElement?.children[value ? 0 : 1] as HTMLElement | undefined)?.focus();
                  }}
                  className={cn(
                    option,
                    value && "border-l border-line",
                    leaveRest === value ? "bg-gold/10 text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {value ? "Skip the rest" : "Then clear the rest"}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" onClick={() => onChange({ kills: [], leaveRest: false })} className="ml-auto h-7 px-1.5 text-xs text-muted hover:text-fg">
            Clear
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="mt-1 text-[0.65rem] text-loss">{error}</p>
      ) : (
        <p className="mt-1 text-[0.65rem] text-faint">
          {!rows.length
            ? "Optional. Click creeps in the order to kill them. Empty means clear the whole camp."
            : !rest.length
              ? "Clears the camp in this order."
              : leaveRest
                ? `Skips ${rest.length}. Hero after counts only these kills.`
                : "Kills these first, then the rest of the camp."}
        </p>
      )}
    </div>
  );
}
