import type { Bracket, BracketMatch } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function Seed({
  side,
  won,
}: {
  side?: { name: string; score?: number; seed?: number };
  won: boolean;
}) {
  if (!side) {
    return (
      <div className="flex items-center justify-between px-3 py-2 text-sm text-faint">
        <span className="italic">TBD</span>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 text-sm",
        won ? "text-fg" : "text-muted",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {side.seed ? (
          <span className="tnum w-4 shrink-0 text-[0.65rem] text-faint">
            {side.seed}
          </span>
        ) : null}
        <span className="truncate font-medium">{side.name}</span>
      </span>
      {side.score !== undefined ? (
        <span
          className={cn("tnum font-bold", won ? "text-gold" : "text-faint")}
        >
          {side.score}
        </span>
      ) : null}
    </div>
  );
}

function MatchCell({ match }: { match: BracketMatch }) {
  const homeWon =
    match.status === "completed" &&
    (match.home?.score ?? 0) > (match.away?.score ?? 0);
  const awayWon =
    match.status === "completed" &&
    (match.away?.score ?? 0) > (match.home?.score ?? 0);
  const pending = match.status !== "completed";

  return (
    <div
      className={cn(
        "w-56 overflow-hidden rounded-lg border bg-surface/80",
        match.status === "live" ? "border-live/50" : "border-line",
      )}
    >
      <Seed side={match.home} won={homeWon || pending} />
      <div className="rule-gold opacity-50" aria-hidden />
      <Seed side={match.away} won={awayWon || pending} />
      {match.status === "live" ? (
        <div className="bg-live/10 px-3 py-1 text-center font-mono text-[0.6rem] uppercase tracking-[0.2em] text-live">
          Live now
        </div>
      ) : null}
    </div>
  );
}

export function BracketView({ bracket }: { bracket: Bracket }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-10">
        {bracket.rounds.map((round) => (
          <div key={round.name} className="flex flex-col">
            <p className="kicker mb-5">{round.name}</p>
            <div className="flex flex-1 flex-col justify-around gap-6">
              {round.matches.map((m) => (
                <MatchCell key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
