import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { TeamPlate } from "@/components/league/VsBadge";
import { DataSourceNote } from "@/components/DataSourceNote";
import { LadderTeams } from "@/components/league/LadderTeams";
import { PastSeasonNote } from "@/components/league/PastSeasonNote";
import { getLadder, getSeason, getSeasons } from "@/lib/api/gnl";
import { record, signed } from "@/lib/figures.mjs";
import { parseSeasonParam, type SeasonSearchParams } from "@/lib/api/season-params";
import { GNL_LADDER_LIVE } from "@/lib/flags";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<SeasonSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const season = await getSeason(parseSeasonParam((await searchParams).season));
  return {
    title: season ? `${season.shortName} ladder challenge` : "GNL ladder challenge",
    description:
      `The Gym Newbie League ladder challenge${season ? ` in ${season.shortName}` : ""}: W3Champions games played during the season earn points and achievements for your team.`,
    alternates: { canonical: "/gnl/ladder" },
  };
}

const fmt = new Intl.NumberFormat("en-US");

export default async function LadderPage({ searchParams }: Props) {
  if (!GNL_LADDER_LIVE) notFound();
  const seasons = await getSeasons();
  const season = await getSeason(parseSeasonParam((await searchParams).season));
  if (!season) notFound();
  const { ladder, source } = await getLadder(season.number);

  const topPlayers = ladder
    ? ladder.teams
        .flatMap((t) => t.players.map((p) => ({ ...p, team: t })))
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
    : [];
  const busiest = ladder ? Math.max(1, ...ladder.perDay.map((d) => d.games)) : 1;
  const busiestDay = ladder?.perDay.find((d) => d.games === busiest);

  return (
    <>
      <PageHeader
        kicker={`${season.shortName} · Ladder challenge`}
        title="Ladder"
        lead="Every W3Champions game you play during the season earns ladder points for your team, and achievements on top. Play more, earn more."
      />
      <Container className="py-10">
        <DataSourceNote source={source} />
        <PastSeasonNote season={season} latest={seasons[0]} href="/gnl/ladder" />

        {!ladder ? (
          <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            The ladder is not available right now.
          </p>
        ) : (
          <>
            {/* Season totals */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="panel p-4">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Ladder games this season</p>
                <p className="tnum mt-1 font-display text-2xl font-bold text-gold">{fmt.format(ladder.totalGames)}</p>
              </div>
              <div className="panel p-4">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Players on the ladder</p>
                <p className="tnum mt-1 font-display text-2xl font-bold text-fg">
                  {fmt.format(ladder.teams.reduce((n, t) => n + t.players.filter((p) => p.games > 0).length, 0))}
                </p>
              </div>
              <div className="panel p-4">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">Achievements to earn</p>
                <p className="tnum mt-1 font-display text-2xl font-bold text-fg">{ladder.rules.length}</p>
              </div>
            </section>

            {/* Games per day */}
            {ladder.perDay.length ? (
              <section className="mt-10">
                <p className="kicker mb-3">Games per day</p>
                <div
                  role="img"
                  aria-label={`Ladder games per day over ${ladder.perDay.length} days: ${fmt.format(ladder.totalGames)} games in all, busiest on ${busiestDay?.date} with ${busiest} games.`}
                  className="panel flex h-28 items-end gap-[3px] px-4 pb-3 pt-4"
                >
                  {ladder.perDay.map((d) => (
                    <span
                      key={d.date}
                      title={`${d.date}: ${d.games} games`}
                      className="flex-1 rounded-t-sm bg-gold/70 transition-colors hover:bg-gold"
                      style={{ height: `${Math.max(4, (d.games / busiest) * 100)}%` }}
                    />
                  ))}
                </div>
                <p className="mt-2 flex justify-between font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">
                  <span>{ladder.perDay[0].date}</span>
                  <span>{ladder.perDay[ladder.perDay.length - 1].date}</span>
                </p>
              </section>
            ) : null}

            {/* Team ladder */}
            <section className="mt-12">
              <h2 className="mb-5 font-display text-xl font-bold uppercase">Team ladder</h2>
              <LadderTeams teams={ladder.teams} />
            </section>

            <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1fr]">
              {/* Top players */}
              <section>
                <h2 className="mb-5 font-display text-xl font-bold uppercase">Top grinders</h2>
                <Surface className="divide-y divide-line/60">
                  {topPlayers.map((p, i) => (
                    <div key={p.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                      <span className="tnum font-display text-sm font-bold text-faint">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <RaceIcon race={p.race} size={20} />
                          <Link href={`/gnl/players/${p.slug}`} className="truncate font-display font-bold uppercase text-fg hover:text-gold">
                            {p.name}
                          </Link>
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-faint">
                          <TeamPlate tag={p.team.tag ?? ""} logoUrl={p.team.logoUrl} name={p.team.name} size="sm" />
                          {p.team.name} <span>·</span> <span className="tnum">Ladder games {record(p.wins, p.losses) ?? "—"}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tnum font-display text-lg font-bold text-gold">{fmt.format(p.points)}</p>
                        <p className="tnum font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">
                          MMR {p.mmr.current}
                          <span className={p.mmr.current - p.mmr.start >= 0 ? "text-win" : "text-loss"}>
                            {" "}
                            {signed(p.mmr.current - p.mmr.start)}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </Surface>
              </section>

              {/* Achievements */}
              <section>
                <h2 className="mb-5 font-display text-xl font-bold uppercase">Achievements</h2>
                <Surface className="divide-y divide-line/60">
                  {ladder.rules.map((r) => {
                    const earned = ladder.teams.reduce(
                      (n, t) => n + t.players.filter((p) => p.achievements.some((a) => a.id === r.id)).length,
                      0,
                    );
                    return (
                      <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                        <span className="grid size-9 place-items-center rounded border border-gold/30 bg-gold/10 text-gold">
                          <Trophy size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold uppercase text-fg">{r.name}</p>
                          <p className="text-xs text-muted">{r.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="tnum font-display text-base font-bold text-gold">{r.points}</p>
                          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">
                            {earned ? `${earned} earned` : "unclaimed"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </Surface>
              </section>
            </div>

            {ladder.syncedAt ? (
              <p className="mt-8 font-mono text-xs uppercase tracking-wide text-faint">
                Synced from W3Champions {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ladder.syncedAt))}
              </p>
            ) : null}
          </>
        )}
      </Container>
    </>
  );
}
