import { Fragment } from "react";
import { creepsLeft } from "@/lib/creep-routes/kills.mjs";
import type { MapCamp, StopKill } from "@/lib/creep-routes/types";
import { CampIcon } from "./CampIcon";

/**
 * A stop's kill order, read left to right: creep icon and name, `×n` for
 * more than one, `›` between kills, then "Leaves N" when the stop does not
 * clear the camp. Renders nothing for a stop without `kills` (a full clear).
 */
export function KillOrder({ camp, kills }: { camp: MapCamp; kills?: StopKill[] }) {
  if (!kills?.length) return null;
  const left = creepsLeft(camp, kills);
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs" aria-label="Kill order">
      {kills.map((k, i) => {
        const creep = camp.creeps[k.row];
        if (!creep) return null;
        return (
          <Fragment key={i}>
            {i > 0 ? <span aria-hidden className="text-faint">›</span> : null}
            <span className="inline-flex items-center gap-1">
              <CampIcon iconKey={creep.icon} title={creep.name} kind="creep" size={20} />
              <span className="text-fg">{creep.name}</span>
              {k.n > 1 ? <span className="tnum text-faint">×{k.n}</span> : null}
            </span>
          </Fragment>
        );
      })}
      {left > 0 ? <span className="tnum text-faint">· Leaves {left}</span> : null}
    </span>
  );
}
