"use client";

import { RaceCrestRow, RaceCrestMultiRow, type CrestOption } from "@/components/builds/RaceCrestPicker";
import { IconPicker } from "@/components/builds/IconPicker";
import type { IconRace } from "@/lib/builds/icons";
import type { BuildRace } from "@/lib/builds/types";
import { ROUTE_LEVELS, type CreepMap, type RouteLevel } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";

const select =
  "h-10 rounded border border-line bg-surface/60 px-3 text-sm text-fg focus:border-gold/60 focus:outline-none";
const label = "block font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted";

/** The setup row above the editor: which map, your race, opponent(s),
 *  level, optional hero and optional companion build. Every choice here
 *  feeds the editor below (the map shown, the icon picker's race tab) and
 *  the submission itself. */
export function RouteSetup({
  maps,
  mapSlug,
  onMapChange,
  race,
  onRaceChange,
  vsRaces,
  onVsRacesChange,
  level,
  onLevelChange,
  hero,
  onHeroChange,
  builds,
  buildSlug,
  onBuildChange,
  errors,
}: {
  maps: CreepMap[];
  mapSlug: string;
  onMapChange: (slug: string) => void;
  race: CrestOption | "";
  onRaceChange: (r: CrestOption) => void;
  vsRaces: BuildRace[];
  onVsRacesChange: (r: BuildRace[]) => void;
  level: RouteLevel;
  onLevelChange: (l: RouteLevel) => void;
  hero: string;
  onHeroChange: (h: string) => void;
  builds: { slug: string; title: string }[];
  buildSlug: string;
  onBuildChange: (s: string) => void;
  errors: Record<string, string>;
}) {
  const iconRace = (race && race !== "any" ? race : undefined) as IconRace | undefined;

  return (
    // `.panel`'s `backdrop-filter` makes this section its own stacking
    // context (not just `position: relative`), so its `z-index: auto`
    // ordinarily loses to the *next* `.panel` section below it (the map/
    // stop editor) purely because that one comes later in the DOM — even
    // though the hero picker's own popover is `z-40` inside here. `z-10`
    // raises this whole section above that sibling so an open popover that
    // overflows past this section's bottom edge (e.g. the hero picker with
    // many rows) paints on top of the map/stop editor instead of under it.
    // Still well below the site header/sub-nav (`z-40`/`z-50`).
    <section className="panel z-10 space-y-6 p-5 sm:p-7">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="route-map">Map</label>
          <select
            id="route-map"
            aria-label="Map"
            value={mapSlug}
            onChange={(e) => onMapChange(e.target.value)}
            className={cn(select, "mt-1.5 w-full")}
          >
            {maps.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
          {errors.map ? <p className="mt-1 text-xs text-loss">{errors.map}</p> : null}
        </div>
        <div>
          <label className={label} htmlFor="route-level">Level</label>
          <div className="mt-1.5 flex gap-1">
            {ROUTE_LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onLevelChange(l.id)}
                aria-pressed={level === l.id}
                className={cn(
                  "h-10 flex-1 rounded border font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] transition-colors",
                  level === l.id ? "border-gold bg-gold/10 text-fg" : "border-line bg-surface/60 text-muted hover:text-fg",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className={label}>Your race</p>
          <div className="mt-1.5">
            <RaceCrestRow value={race} onChange={onRaceChange} size="sm" />
          </div>
          {errors.race ? <p className="mt-1 text-xs text-loss">{errors.race}</p> : null}
        </div>
        <div>
          <p className={label}>Against</p>
          <div className="mt-1.5">
            <RaceCrestMultiRow value={vsRaces} onChange={onVsRacesChange} size="sm" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className={label}>Hero (optional)</p>
          <div className="mt-1.5">
            <IconPicker value={hero} onChange={onHeroChange} race={iconRace} kind="hero" />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="route-build">Companion build (optional)</label>
          <select
            id="route-build"
            aria-label="Companion build"
            value={buildSlug}
            onChange={(e) => onBuildChange(e.target.value)}
            className={cn(select, "mt-1.5 w-full")}
          >
            <option value="">None</option>
            {builds.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
