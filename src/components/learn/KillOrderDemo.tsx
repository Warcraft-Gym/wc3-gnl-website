"use client";

import { useMemo, useState } from "react";
import { deriveRoute } from "@/lib/creep-routes/derive";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import { killedXpShare } from "@/lib/creep-routes/kills.mjs";
import type { CreepMap, MapCamp, StopKill } from "@/lib/creep-routes/types";
import { BAND_LABEL, BandDot } from "@/components/creep-routes/RouteBadges";
import { HeroMeter } from "@/components/creep-routes/HeroMeter";
import { KillOrderField } from "@/components/creep-routes/KillOrderField";
import { cn } from "@/lib/utils";

export type KillOrderPreset = { label: string; kills: StopKill[]; leaveRest?: boolean };

type Stop = { kills: StopKill[]; leaveRest: boolean };

const sameStop = (a: Stop, p: KillOrderPreset) =>
  JSON.stringify(a.kills) === JSON.stringify(p.kills) && a.leaveRest === Boolean(p.leaveRest);

/**
 * A guide's playable stop: the route builder's kill order field on one camp,
 * under the summary line a route page draws for that stop (band dot, camp,
 * hero meter). A level 1 hero with no XP walks in. `presets` load example
 * orders; the first is the start state.
 */
export function KillOrderDemo({ camp, caption, presets }: { camp: MapCamp; caption: string; presets: KillOrderPreset[] }) {
  const [stop, setStop] = useState<Stop>({ kills: presets[0]?.kills ?? [], leaveRest: Boolean(presets[0]?.leaveRest) });
  const d = useMemo(
    // deriveRoute only looks camps up by id, so a one-camp map is enough.
    () => deriveRoute({ stops: [{ campId: camp.id, ...stop }] }, { camps: [camp] } as CreepMap).stops[0],
    [camp, stop],
  );
  return (
    <figure className="panel my-8 text-base leading-normal">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/60 px-4 py-3 sm:px-5">
        <span className="mr-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">Examples</span>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={sameStop(stop, p)}
            onClick={() => setStop({ kills: p.kills, leaveRest: Boolean(p.leaveRest) })}
            className={cn(
              "h-7 rounded border px-2 text-xs transition-colors",
              sameStop(stop, p) ? "border-gold/60 bg-gold/10 text-fg" : "border-line text-muted hover:text-fg",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <p className="min-w-0 pt-0.5 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-x-2">
            <span className="inline-flex items-start gap-1.5">
              <BandDot className="mt-1.5" band={camp.band} killed={d.left > 0 ? killedXpShare(camp, stop.kills, stop.leaveRest) : undefined} />
              <span className="font-medium text-fg">{campLabel(camp)}</span>
            </span>
            <span className="block pl-3.5 text-muted sm:pl-0">
              {BAND_LABEL[camp.band] ?? camp.band} · Lv {camp.level}
            </span>
          </p>
          <HeroMeter level={d.heroLevelAfter} xp={d.xpAfter} />
        </div>
        <KillOrderField
          camp={camp}
          kills={stop.kills}
          leaveRest={stop.leaveRest}
          trace={d.kills}
          onChange={(patch) => setStop((s) => ({ ...s, ...patch }))}
        />
      </div>
      <figcaption className="border-t border-line/60 px-4 py-2.5 text-xs text-faint sm:px-5">{caption}</figcaption>
    </figure>
  );
}
