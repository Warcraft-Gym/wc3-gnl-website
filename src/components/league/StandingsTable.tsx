import { SeasonLink as Link } from "./SeasonLink";
import type { StandingRow } from "@/lib/api/types";
import { TeamPlate } from "./VsBadge";
import { signed } from "@/lib/figures.mjs";
import { cn } from "@/lib/utils";

/** The last five results as pips, oldest to newest. */
function FormPips({ form }: { form: StandingRow["form"] }) {
  const last = form.slice(-5);
  if (!last.length) return <span className="text-faint">-</span>;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`Last ${last.length}: ${last.join(", ")}`}>
      {last.map((r, i) => (
        <span
          key={i}
          title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"}
          className={cn(
            "grid size-5 place-items-center rounded-sm font-mono text-[0.6rem] font-bold",
            r === "W" && "bg-win/20 text-win",
            r === "D" && "bg-surface-2 text-muted",
            r === "L" && "bg-loss/15 text-loss",
          )}
        >
          {r}
        </span>
      ))}
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
    <div className="panel overflow-x-auto">
      <table
        className={cn(
          "w-full border-collapse text-sm max-sm:[&_td]:px-2 max-sm:[&_th]:px-2",
          compact ? "sm:min-w-[20rem]" : "sm:min-w-[40rem]",
        )}
      >
        <thead>
          <tr className="border-b border-line bg-surface/60 text-left font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
            <th className="w-10 px-4 py-3 text-center font-medium">#</th>
            <th className="px-2 py-3 font-medium">Team</th>
            <th className="px-3 py-3 text-center font-medium max-sm:hidden">P</th>
            <th className="px-3 py-3 text-center font-medium">W</th>
            <th className="px-3 py-3 text-center font-medium max-sm:hidden">D</th>
            <th className="px-3 py-3 text-center font-medium">L</th>
            {!compact && <th className="px-3 py-3 text-center font-medium max-sm:hidden">Form</th>}
            <th className="px-3 py-3 text-right font-medium max-sm:hidden">Diff</th>
            <th className="px-4 py-3 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const leader = row.rank === 1;
            return (
              <tr
                key={row.team.id}
                className={cn(
                  "group border-b border-line/50 transition-colors last:border-0 hover:bg-surface-2/50",
                  leader && "bg-gold/[0.04]",
                )}
              >
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      "tnum inline-grid size-6 place-items-center rounded text-xs font-bold",
                      leader ? "bg-gold text-bg-deep" : "text-faint",
                    )}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <Link
                    href={`/gnl/teams/${row.team.slug}`}
                    className="flex items-center gap-2.5 transition-colors group-hover:text-gold"
                  >
                    <TeamPlate
                      tag={row.team.tag ?? ""}
                      logoUrl={row.team.logoUrl}
                      name={row.team.name}
                      size="sm"
                    />
                    {/* A table cell grows to its content, so the name gets a cap on
                        phones and the captains line waits for a wider screen. */}
                    <span className="min-w-0 max-sm:max-w-[8.5rem]">
                      <span className="block truncate font-display font-bold uppercase text-fg transition-colors group-hover:text-gold">
                        {row.team.name}
                      </span>
                      {row.captains.length && !compact ? (
                        <span className="block truncate text-xs font-normal normal-case text-faint max-sm:hidden">
                          Captain{row.captains.length > 1 ? "s" : ""} {row.captains.join(" & ")}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </td>
                <td className="tnum px-3 py-3 text-center text-muted max-sm:hidden">{row.played}</td>
                <td className="tnum px-3 py-3 text-center text-win">{row.wins}</td>
                <td className="tnum px-3 py-3 text-center text-muted max-sm:hidden">{row.draws}</td>
                <td className="tnum px-3 py-3 text-center text-loss">{row.losses}</td>
                {!compact && (
                  <td className="px-3 py-3 text-center max-sm:hidden">
                    <FormPips form={row.form} />
                  </td>
                )}
                <td
                  className={cn(
                    "tnum px-3 py-3 text-right text-xs max-sm:hidden",
                    row.mapDiff > 0 ? "text-win/80" : row.mapDiff < 0 ? "text-loss/80" : "text-faint",
                  )}
                >
                  {signed(row.mapDiff)}
                </td>
                <td className={cn("tnum px-4 py-3 text-right font-display text-base font-bold", leader ? "text-gold" : "text-fg")}>
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
