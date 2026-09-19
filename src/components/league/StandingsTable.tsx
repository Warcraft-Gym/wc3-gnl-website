import Link from "next/link";
import type { StandingRow } from "@/lib/api/types";
import { TeamPlate } from "./VsBadge";
import { cn } from "@/lib/utils";

/** The last five results as pips, oldest to newest. */
function FormPips({ form }: { form: StandingRow["form"] }) {
  const last = form.slice(-5);
  if (!last.length) return <span className="text-faint">-</span>;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Last ${last.length}: ${last.join(", ")}`}>
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
    <div className="overflow-x-auto rounded-lg border border-line">
      <table
        className={cn(
          "w-full border-collapse text-sm",
          compact ? "min-w-[20rem]" : "min-w-[40rem]",
        )}
      >
        <thead>
          <tr className="border-b border-line bg-surface/60 text-left font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
            <th className="w-10 px-4 py-3 text-center font-medium">#</th>
            <th className="px-2 py-3 font-medium">Team</th>
            <th className={cn("px-3 py-3 text-center font-medium", compact && "max-sm:hidden")}>P</th>
            <th className="px-3 py-3 text-center font-medium">W</th>
            <th className="px-3 py-3 text-center font-medium">D</th>
            <th className="px-3 py-3 text-center font-medium">L</th>
            {!compact && <th className="px-3 py-3 text-center font-medium">Form</th>}
            <th className={cn("px-3 py-3 text-right font-medium", compact && "max-sm:hidden")}>Diff</th>
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
                    <span className="min-w-0">
                      <span className="block truncate font-display font-bold uppercase text-fg transition-colors group-hover:text-gold">
                        {row.team.name}
                      </span>
                      {row.captains.length && !compact ? (
                        <span className="block truncate text-xs font-normal normal-case text-faint">
                          Captain{row.captains.length > 1 ? "s" : ""} {row.captains.join(" & ")}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </td>
                <td className={cn("tnum px-3 py-3 text-center text-muted", compact && "max-sm:hidden")}>{row.played}</td>
                <td className="tnum px-3 py-3 text-center text-win">{row.wins}</td>
                <td className="tnum px-3 py-3 text-center text-muted">{row.draws}</td>
                <td className="tnum px-3 py-3 text-center text-loss">{row.losses}</td>
                {!compact && (
                  <td className="px-3 py-3 text-center">
                    <FormPips form={row.form} />
                  </td>
                )}
                <td
                  className={cn(
                    "tnum px-3 py-3 text-right text-xs",
                    compact && "max-sm:hidden",
                    row.mapDiff > 0 ? "text-win/80" : row.mapDiff < 0 ? "text-loss/80" : "text-faint",
                  )}
                >
                  {row.mapDiff > 0 ? `+${row.mapDiff}` : row.mapDiff}
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
