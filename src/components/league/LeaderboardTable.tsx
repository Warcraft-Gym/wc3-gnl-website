import type { LeaderboardRow } from "@/lib/api/types";
import { RaceBadge } from "@/components/ui/Badge";
import { cn, raceOf } from "@/lib/utils";

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[38rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface/60 text-left font-mono text-[0.64rem] font-bold uppercase tracking-[0.16em] text-faint">
            <th className="w-12 px-4 py-3 text-center">#</th>
            <th className="px-2 py-3">Player</th>
            <th className="px-3 py-3">Race</th>
            <th className="px-3 py-3 text-center">W</th>
            <th className="px-3 py-3 text-center">L</th>
            <th className="px-3 py-3 text-center">Win %</th>
            <th className="px-4 py-3 text-right">MMR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const top = row.rank <= 3;
            return (
              <tr
                key={row.player.id}
                className="border-b border-line/50 transition-colors last:border-0 hover:bg-surface-2/50"
              >
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      "tnum skew inline-grid h-6 w-8 place-items-center text-xs font-extrabold",
                      top ? "bg-gold text-bg-deep" : "text-faint",
                    )}
                  >
                    <span>{row.rank}</span>
                  </span>
                </td>
                <td className="px-2 py-3 font-display font-bold uppercase text-fg">
                  {row.player.name}
                  {row.player.teamName ? (
                    <span className="ml-2 font-sans text-xs font-normal normal-case text-faint">
                      {row.player.teamName}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <RaceBadge race={raceOf(row.player.race)} showLabel={false} />
                </td>
                <td className="tnum px-3 py-3 text-center text-win">{row.wins}</td>
                <td className="tnum px-3 py-3 text-center text-loss">{row.losses}</td>
                <td className="tnum px-3 py-3 text-center text-muted">
                  {row.winrate}%
                </td>
                <td className="tnum px-4 py-3 text-right font-display text-base font-bold text-gold">
                  {row.mmr ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
