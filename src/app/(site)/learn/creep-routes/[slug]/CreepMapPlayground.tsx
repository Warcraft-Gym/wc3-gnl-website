"use client";

import { useState } from "react";
import { CreepMap } from "@/components/creep-routes/CreepMap";
import { RouteStepTable } from "@/components/creep-routes/RouteStepTable";
import type { CreepMap as CreepMapType, CreepRoute } from "@/lib/creep-routes/types";

/**
 * The map and the step table share one piece of state — the active stop —
 * lifted here so pressing play in the table lights the same marker on the
 * map. Map left, table right and sticky at `lg`; stacked below.
 */
export function CreepMapPlayground({ map, route }: { map: CreepMapType; route: CreepRoute }) {
  const [activeStop, setActiveStop] = useState<number | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8">
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)]">
        <CreepMap map={map} route={route} activeStop={activeStop} />
      </div>
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)]">
        <RouteStepTable route={route} map={map} onActiveChange={setActiveStop} />
      </div>
    </div>
  );
}
