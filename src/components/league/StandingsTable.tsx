import Link from "next/link";
import type { StandingRow } from "@/lib/api/types";
import { TeamPlate } from "./VsBadge";
import { cn } from "@/lib/utils";

function StreakPill({ streak }: { streak?: string }) {
  if (!streak) return <span className="text-faint">—</span>;
  const win = streak.startsWith("W");
  return (
    <span
      className={cn(
        "tnum rounded px-1.5 py-0.5 text-xs font-semibold",
        win ? "bg-win/15 text-win" : "bg-loss/15 text-loss",
      )}
    >
      {streak}
    </span>
  );
}

export function StandingsTable({
  rows,
  compact = false,
}: {
  rows: StandingRow[];
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface/60 text-left font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
            <th className="w-10 px-4 py-3 text-center font-medium">#</th>
            <th className="px-2 py-3 font-medium">Team</th>
            <th className="px-3 py-3 text-center font-medium">P</th>
            <th className="px-3 py-3 text-center font-medium">W</th>
            <th className="px-3 py-3 text-center font-medium">L</th>
            <th className="px-3 py-3 text-center font-medium">Diff</th>
            {!compact && (
              <th className="px-3 py-3 text-center font-medium">Streak</th>
            )}
            <th className="px-4 py-3 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const top = row.rank <= 4;
            return (
              <tr
                key={row.team.id}
                className="group border-b border-line/50 transition-colors last:border-0 hover:bg-surface-2/50"
              >
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      "tnum inline-grid size-6 place-items-center rounded text-xs font-bold",
                      top ? "bg-gold/15 text-gold" : "text-faint",
                    )}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <Link
                    href={`/gnl/teams/${row.team.slug}`}
                    className="flex items-center gap-2.5 font-display font-bold uppercase text-fg transition-colors group-hover:text-gold"
                  >
                    <TeamPlate
                      tag={row.team.tag ?? ""}
                      logoUrl={row.team.logoUrl}
                      name={row.team.name}
                      size="sm"
                    />
                    {row.team.name}
                  </Link>
                </td>
                <td className="tnum px-3 py-3 text-center text-muted">{row.played}</td>
                <td className="tnum px-3 py-3 text-center text-win">{row.wins}</td>
                <td className="tnum px-3 py-3 text-center text-loss">{row.losses}</td>
                <td
                  className={cn(
                    "tnum px-3 py-3 text-center",
                    row.mapDiff > 0
                      ? "text-win"
                      : row.mapDiff < 0
                        ? "text-loss"
                        : "text-muted",
                  )}
                >
                  {row.mapDiff > 0 ? `+${row.mapDiff}` : row.mapDiff}
                </td>
                {!compact && (
                  <td className="px-3 py-3 text-center">
                    <StreakPill streak={row.streak} />
                  </td>
                )}
                <td className="tnum px-4 py-3 text-right font-display text-base font-bold text-fg">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
