"use client";

import { useMemo, useState } from "react";
import { deriveRoute } from "@/lib/creep-routes/derive";
import type { CreepMap, CreepRoute, StopKill } from "@/lib/creep-routes/types";
import { CreepMapPlayground } from "@/components/creep-routes/CreepMapPlayground";
import { KillOrderField } from "@/components/creep-routes/KillOrderField";
import { cn } from "@/lib/utils";

export type KillOrderPreset = { label: string; kills: StopKill[]; leaveRest?: boolean };

type Edit = { kills: StopKill[]; leaveRest: boolean };

const isPreset = (e: Edit, p: KillOrderPreset) =>
  JSON.stringify(e.kills) === JSON.stringify(p.kills) && e.leaveRest === Boolean(p.leaveRest);

/**
 * One stop of a route as its route page draws it open, with the route
 * builder's kill order field in place of the read-only chain, so a reader
 * can reorder the kills and watch the hero meter. `presets` load example
 * orders; the first is the start state.
 */
export function KillOrderDemo({
  map,
  route,
  stop,
  caption,
  presets,
}: {
  map: CreepMap;
  route: CreepRoute;
  stop: number;
  caption: string;
  presets: KillOrderPreset[];
}) {
  const [edit, setEdit] = useState<Edit>({ kills: presets[0]?.kills ?? [], leaveRest: Boolean(presets[0]?.leaveRest) });
  const edited = useMemo(
    () => ({ ...route, stops: route.stops.map((s, i) => (i === stop ? { ...s, ...edit } : s)) }),
    [route, stop, edit],
  );
  const trace = useMemo(() => deriveRoute(edited, map).stops[stop]?.kills ?? [], [edited, map, stop]);
  const camp = map.camps.find((c) => c.id === route.stops[stop]?.campId);
  if (!camp) return null;
  return (
    <figure className="my-8 text-base leading-normal">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">Examples</span>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={isPreset(edit, p)}
            onClick={() => setEdit({ kills: p.kills, leaveRest: Boolean(p.leaveRest) })}
            className={cn(
              "h-7 rounded border px-2 text-xs transition-colors",
              isPreset(edit, p) ? "border-gold/60 bg-gold/10 text-fg" : "border-line text-muted hover:text-fg",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <CreepMapPlayground
        map={map}
        route={edited}
        show="stops"
        only={stop}
        stopBody={
          <KillOrderField
            camp={camp}
            kills={edit.kills}
            leaveRest={edit.leaveRest}
            trace={trace}
            onChange={(patch) => setEdit((e) => ({ ...e, ...patch }))}
          />
        }
      />
      <figcaption className="mt-2 text-sm text-faint">{caption}</figcaption>
    </figure>
  );
}
