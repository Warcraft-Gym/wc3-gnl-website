import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { KeyArt } from "@/components/ui/KeyArt";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { TeamPlate } from "@/components/league/VsBadge";
import { CaptainBadge } from "@/components/league/CaptainBadge";
import { getActiveSeason, getPlayerProfile } from "@/lib/api/gnl";
import { cn, raceOf } from "@/lib/utils";
import type { MatchStatus } from "@/lib/api/types";

type Params = { params: Promise<{ slug: string }> };

const RACE_LABEL: Record<string, string> = { human: "Human", orc: "Orc", nightelf: "Night Elf", undead: "Undead", random: "Random" };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPlayerProfile(slug);
  if (!profile) return { title: "Player" };
  const { player, team } = profile;
  return {
    title: `${player.name}, GNL player`,
    description: `${player.name} (${RACE_LABEL[player.race]}${team ? `, ${team.name}` : ""}) in the Gym Newbie League: season record, W3Champions MMR, career stats and series.`,
    alternates: { canonical: `/gnl/players/${slug}` },
  };
}

function pct(w: number, l: number) {
  const n = w + l;
  return n ? Math.round((w * 100) / n) : 0;
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="panel p-4">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className={cn("tnum mt-1 font-display text-2xl font-bold", tone ?? "text-fg")}>{value}</p>
    </div>
  );
}

const STATUS_LABEL: Record<MatchStatus, string> = { scheduled: "Scheduled", live: "Live", completed: "Final" };

export default async function PlayerPage({ params }: Params) {
  const { slug } = await params;
  const [profile, season] = await Promise.all([getPlayerProfile(slug), getActiveSeason()]);
  if (!profile) notFound();
  const { player, team, isCaptain, captainOnly, season: rec, w3c, career, series } = profile;
  const w3cUrl = player.battleTag
    ? `https://w3champions.com/player/${encodeURIComponent(player.battleTag)}`
    : undefined;

  return (
    <>
      {/* Masthead: the player's race showcase runs under the nav bar; Random
          players get the shared scene since there is no Random art */}
      <div className="keyart -mt-[var(--wg-chrome-h,var(--wg-header-h))]">
        <KeyArt
          src={player.race === "random" ? "/keyart/feature-orc-vs-human.webp" : `/factions/headers/${player.race}.webp`}
          position="center 30%"
          overlay="soft"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(0,0,0,.8)_0%,rgba(0,0,0,.55)_45%,rgba(0,0,0,.15)_100%)]"
        />
        <Container className="relative z-10 pb-12 pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+2.5rem)] sm:pb-16 sm:pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+3.5rem)]">
          <Link
            href={team ? `/gnl/teams/${team.slug}` : "/gnl/teams"}
            className="mb-6 inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> {team ? team.name : "Teams"}
          </Link>
          <div className="flex flex-wrap items-center gap-5">
            <RaceIcon race={player.race} size={64} />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-3 text-[length:var(--wg-text-display)] font-extrabold [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
                {player.name}
                {isCaptain ? <CaptainBadge /> : null}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <RaceBadge race={raceOf(player.race)} />
                {team ? (
                  <Link href={`/gnl/teams/${team.slug}`} className="inline-flex items-center gap-2 hover:text-gold">
                    <TeamPlate tag={team.tag!} logoUrl={team.logoUrl} name={team.name} size="sm" />
                    {team.name}
                  </Link>
                ) : null}
                {player.country ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {player.country}
                  </span>
                ) : null}
                {w3cUrl ? (
                  <a href={w3cUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline">
                    {player.battleTag} <ExternalLink size={11} />
                  </a>
                ) : null}
              </p>
            </div>
          </div>
        </Container>
        <div className="rivets relative z-10" aria-hidden />
      </div>

      <Container className="py-10">
        {/* Season record + W3C */}
        {captainOnly ? (
          <p className="mb-6 border-l-2 border-gold/60 pl-4 text-sm text-muted">
            Captains {team?.name ?? "the team"} this season without playing in the roster. Ladder and career numbers below are their own.
          </p>
        ) : null}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {captainOnly ? null : (
            <>
              <Stat label={`${season.shortName} record`} value={<>{rec.wins}<span className="text-faint"> - </span>{rec.losses}</>} />
              <Stat label="Series win rate" value={`${pct(rec.wins, rec.losses)}%`} tone={pct(rec.wins, rec.losses) >= 50 ? "text-win" : "text-loss"} />
            </>
          )}
          <Stat label="W3C MMR" value={player.mmr ?? "-"} tone="text-gold" />
          <Stat label="Career rating" value={career?.rating ?? "-"} />
        </section>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-10">
            {w3c.length ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">W3Champions ladder</h2>
                <Surface className="divide-y divide-line/60">
                  {w3c.map((r) => (
                    <div key={r.race} className="flex items-center justify-between gap-3 p-4">
                      <span className="flex items-center gap-2">
                        <RaceBadge race={r.race} />
                      </span>
                      <span className="tnum text-sm text-muted">
                        {r.wins}W {r.losses}L <span className="text-faint">·</span> {pct(r.wins, r.losses)}%
                      </span>
                      <span className="tnum font-display text-lg font-bold text-gold">{r.mmr}</span>
                    </div>
                  ))}
                </Surface>
                <p className="mt-2 text-xs text-faint">Ladder season {w3c[0].season}, synced from W3Champions.</p>
              </section>
            ) : null}

            {career ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">GNL career</h2>
                <Surface className="grid grid-cols-2 divide-x divide-y divide-line/60 sm:grid-cols-3">
                  {[
                    ["Seasons", career.seasonsPlayed],
                    ["Rating", career.rating],
                    ["Series", `${career.seriesWon}-${career.seriesLost}`],
                    ["Series win %", `${pct(career.seriesWon, career.seriesLost)}%`],
                    ["Games", `${career.gamesWon}-${career.gamesLost}`],
                    ["Game win %", `${pct(career.gamesWon, career.gamesLost)}%`],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="p-4">
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">{k}</p>
                      <p className="tnum mt-1 font-display text-lg font-bold text-fg">{v}</p>
                    </div>
                  ))}
                </Surface>
              </section>
            ) : null}

            {rec.matchupHistory.length ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">Faced this season</h2>
                <div className="flex flex-wrap gap-1.5">
                  {rec.matchupHistory.map((r, i) => (
                    <RaceIcon key={i} race={r} size={22} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <section className={captainOnly && !series.length ? "hidden" : undefined}>
            <h2 className="mb-4 font-display text-xl font-bold uppercase">Series this season</h2>
            {series.length ? (
              <Surface className="divide-y divide-line/60">
                {series.map((s) => {
                  const won = s.status === "completed" && s.score > s.opponentScore;
                  const lost = s.status === "completed" && s.score < s.opponentScore;
                  return (
                    <div key={s.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 p-4">
                      <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-faint">
                        Week {s.week}
                        <span className="mt-0.5 block">{STATUS_LABEL[s.status]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <RaceIcon race={s.race} size={16} />
                          <span className="text-faint">vs</span>
                          <RaceIcon race={s.opponent.race} size={16} />
                          <Link href={`/gnl/players/${s.opponent.slug}`} className="font-display font-bold uppercase text-fg hover:text-gold">
                            {s.opponent.name}
                          </Link>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-faint">
                          {s.fixture.homeTeam} vs {s.fixture.awayTeam}
                        </p>
                      </div>
                      <div className={cn("tnum font-display text-lg font-bold", won ? "text-win" : lost ? "text-loss" : "text-faint")}>
                        {s.status === "scheduled" ? "-" : `${s.score} : ${s.opponentScore}`}
                      </div>
                    </div>
                  );
                })}
              </Surface>
            ) : (
              <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
                No series yet this season.
              </p>
            )}
          </section>
        </div>
      </Container>
    </>
  );
}
