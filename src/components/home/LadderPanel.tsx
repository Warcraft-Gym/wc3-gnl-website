import { ArrowRight } from "lucide-react";
import type { Season, StandingRow } from "@/lib/api/types";
import { StandingsTable } from "@/components/league/StandingsTable";
import { ButtonLink } from "@/components/ui/Button";

const SCORING = [
  "4 points for a 2–0 sweep",
  "3 points for a 2–1 win",
  "1 point even for a 1–2 loss",
];

/** "Choose your edition" style panel: the table where the box art would be,
 *  copy on the right, full-width gold action at the bottom. */
export function LadderPanel({
  season,
  rows,
}: {
  season: Season;
  rows: StandingRow[];
}) {
  return (
    <div className="panel grid gap-6 p-4 sm:p-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10 lg:p-8">
      <div className="min-w-0">
        <StandingsTable rows={rows} compact />
      </div>

      <div className="flex flex-col">
        <p className="kicker">Week {season.currentWeek} of {season.totalWeeks}</p>
        <h3 className="mt-2 text-[1.5rem] font-bold tracking-[0.05em]">
          {season.shortName} standings
        </h3>
        <p className="mt-3 text-sm text-muted">
          Every week each team plays a series of solo best-of-threes. Results
          feed straight into the table — top four go through.
        </p>
        <ul className="mt-5 space-y-1.5 text-sm text-muted">
          {SCORING.map((s) => (
            <li key={s} className="flex items-start gap-2">
              <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-gold" />
              {s}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-8">
          <ButtonLink href="/gnl/standings" size="lg" className="w-full">
            Full standings <ArrowRight size={18} />
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
