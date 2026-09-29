import { leftRows } from "@/lib/creep-routes/kills.mjs";
import type { MapCamp, StopKill } from "@/lib/creep-routes/types";
import { CampIcon } from "./CampIcon";

/**
 * A stop's kill order as a numbered list, one kill per line, on its own
 * panel so it never reads as part of the note. Steps carry a square gold
 * badge — square so "1" is not mistaken for the map's round stop badge.
 * A partial stop ends with a "Leave" line naming the creeps left alive,
 * their icons greyed. Renders nothing for a stop without `kills` (a full clear).
 */
export function KillOrder({ camp, kills }: { camp: MapCamp; kills?: StopKill[] }) {
  if (!kills?.length) return null;
  const left = leftRows(camp, kills);
  return (
    <div className="w-full rounded border border-line/60 bg-surface-2/60 px-2.5 py-2">
      <p className="mb-1.5 text-[0.7rem] font-medium text-muted">Kill order</p>
      <ol className="space-y-1.5">
        {kills.map((k, i) => {
          const creep = camp.creeps[k.row];
          if (!creep) return null;
          return (
            <li key={i} className="flex items-center gap-2 text-[0.8rem] text-fg">
              <span className="tnum grid size-5 shrink-0 place-items-center rounded-sm border border-gold/60 bg-gold/15 text-[0.7rem] font-bold text-gold">
                {i + 1}
              </span>
              <CampIcon iconKey={creep.icon} title={creep.name} kind="creep" size={24} />
              <span className="min-w-0">
                {creep.name}
                {k.n > 1 ? <span className="tnum ml-1 text-muted">×{k.n}</span> : null}
              </span>
            </li>
          );
        })}
        {left.length ? (
          <li className="flex items-start gap-2 border-t border-line/50 pt-1.5 text-[0.8rem] text-muted">
            <span className="grid h-6 shrink-0 place-items-center text-[0.7rem] font-bold">Leave</span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {left.map(({ creep, n }, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <CampIcon iconKey={creep.icon} title={creep.name} kind="creep" size={20} className="opacity-60 grayscale" />
                  {creep.name}
                  {n > 1 ? <span className="tnum">×{n}</span> : null}
                </span>
              ))}
            </span>
          </li>
        ) : null}
      </ol>
    </div>
  );
}
