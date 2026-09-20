import { RaceIcon } from "@/components/ui/RaceIcon";
import { record } from "@/lib/figures.mjs";
import type { W3cRaceStat } from "@/lib/api/types";
import { RACES, cn, type Race } from "@/lib/utils";

/**
 * One chip per ladder race: the race icon, its MMR and its record. The main
 * race is bold. The record is printed, not hidden in a tooltip, so a reader on
 * a touch screen or a keyboard gets it too.
 */
type LadderRace = Pick<W3cRaceStat, "race" | "mmr" | "games" | "wins" | "losses">;

export function RaceMmrChips({ races, main }: { races: readonly LadderRace[]; main: Race }) {
  if (!races.length) return <p className="text-sm text-faint">No ladder games this season.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {races.map((r) => {
        const rec = record(r.wins, r.losses);
        return (
          <li
            key={r.race}
            title={`${RACES[r.race].label} · ${r.mmr} MMR · ${rec ?? "no games"} · ${r.games} games`}
            className={cn(
              "flex items-center gap-2 rounded border px-2.5 py-1.5",
              r.race === main ? "border-gold/50 bg-gold/5" : "border-line",
            )}
          >
            <RaceIcon race={r.race} size={20} />
            <span className={cn("tnum text-sm", r.race === main ? "font-bold text-gold" : "text-fg")}>{r.mmr}</span>
            <span className="tnum text-xs text-faint">{rec ?? "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}
