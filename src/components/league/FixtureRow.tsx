"use client";

import { useState } from "react";
import { playerPath } from "@/lib/slug.mjs";
import { SeasonLink as Link } from "./SeasonLink";
import { ChevronRight, PlayCircle, Tv } from "lucide-react";
import type { TeamFixture, PlayerMatch } from "@/lib/api/types";
import { LiveBadge } from "@/components/ui/Badge";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { TeamPlate } from "./VsBadge";
import { cn, raceOf, formatMatchTime } from "@/lib/utils";
import { missingTimeLines } from "@/lib/match-time.mjs";

function gameTime(iso?: string, played = false) {
  // a played series with no time never had one written down
  const missing = missingTimeLines(played);
  if (!iso) return missing;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return missing;
  return {
    day: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(d),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(d),
  };
}

function DetailRow({ m }: { m: PlayerMatch }) {
  const homeWon = m.status === "completed" && m.home.score > m.away.score;
  const awayWon = m.status === "completed" && m.away.score > m.home.score;
  const played = m.status !== "scheduled";
  const { day, time } = gameTime(m.scheduledAt, played);

  const vod = m.casts.find((c) => c.vodUrl);
  const cast = vod ?? m.casts[0];

  return (
    <div className="grid grid-cols-[5.5rem_1fr_auto_1fr_2.5rem] items-center gap-2 border-t border-line/40 px-4 py-2.5 text-sm sm:grid-cols-[7rem_1fr_auto_1fr_4.5rem]">
      <div className="font-mono text-[0.7rem] leading-tight text-faint">
        <div>{day}</div>
        <div>{time}</div>
      </div>

      <div className="flex items-center gap-2 truncate">
        <RaceIcon race={raceOf(m.home.race)} size={24} />
        <Link
          href={playerPath(m.home.playerId, m.home.playerName)}
          className={cn(
            "truncate font-semibold transition-colors hover:text-gold",
            homeWon || !played ? "text-fg" : "text-muted",
          )}
        >
          {m.home.playerName}
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center gap-0.5">
        {m.status === "live" ? (
          <span className="live-dot size-1.5 rounded-full bg-live" aria-hidden />
        ) : null}
        <span className="tnum whitespace-nowrap font-display text-base font-extrabold">
          {played ? (
            <>
              <span className={homeWon ? "text-gold" : "text-faint"}>
                {m.home.score}
              </span>
              <span className="mx-1 text-faint">:</span>
              <span className={awayWon ? "text-gold" : "text-faint"}>
                {m.away.score}
              </span>
            </>
          ) : (
            <span className="text-faint">vs</span>
          )}
        </span>
        {played && (m.home.points != null || m.away.points != null) ? (
          <span
            className="tnum font-mono text-[0.6rem] uppercase tracking-wide text-faint"
            title="Gym Newbie League points earned"
          >
            {m.home.points ?? 0} · {m.away.points ?? 0} pts
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 truncate text-right">
        <Link
          href={playerPath(m.away.playerId, m.away.playerName)}
          className={cn(
            "truncate font-semibold transition-colors hover:text-gold",
            awayWon || !played ? "text-fg" : "text-muted",
          )}
        >
          {m.away.playerName}
        </Link>
        <RaceIcon race={raceOf(m.away.race)} size={24} />
      </div>

      <div className="flex justify-end">
        {cast ? (
          <a
            href={vod?.vodUrl ?? cast.channelUrl}
            target="_blank"
            rel="noreferrer"
            title={vod ? `Watch the VOD on ${cast.name}` : `Cast by ${cast.name}`}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded border px-2 font-mono text-[0.6rem] uppercase tracking-wide transition-colors",
              vod
                ? "border-arcane/60 bg-arcane/10 text-arcane hover:bg-arcane/20"
                : "border-line text-muted hover:border-arcane/60 hover:text-arcane",
            )}
          >
            <Tv size={14} />
            <span className="max-sm:hidden">{vod ? "VOD" : "Cast"}</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function FixtureRow({ fixture, defaultOpen = false }: { fixture: TeamFixture; defaultOpen?: boolean }) {
  const done = fixture.status === "completed";
  const [open, setOpen] = useState(defaultOpen || fixture.status === "live");
  const seriesWon = (side: "home" | "away") =>
    fixture.matches.filter((m) => m.status === "completed" && (side === "home" ? m.home.score > m.away.score : m.away.score > m.home.score)).length;
  const homeSeries = seriesWon("home");
  const awaySeries = seriesWon("away");
  const homeWon = done && fixture.home.score > fixture.away.score;
  const awayWon = done && fixture.away.score > fixture.home.score;
  const showScore = fixture.status !== "scheduled";
  const detailCount = fixture.matches.length;

  return (
    <div className="border border-line bg-surface/70">
      {/* Fixture header */}
      <div className="flex items-center gap-3 p-4">
        <Link
          href={`/gnl/teams/${fixture.home.slug}`}
          className="group flex min-w-0 flex-1 items-center gap-3"
        >
          <span className="max-sm:hidden">
            <TeamPlate
              tag={fixture.home.tag}
              logoUrl={fixture.home.logoUrl}
              name={fixture.home.name}
              size="md"
            />
          </span>
          <span
            className={cn(
              "font-display text-base font-bold uppercase leading-tight transition-colors group-hover:text-gold max-sm:line-clamp-2 max-sm:text-xs sm:truncate sm:text-lg",
              homeWon || !done ? "text-fg" : "text-muted",
            )}
          >
            {fixture.home.name}
          </span>
        </Link>

        <div className="flex shrink-0 flex-col items-center gap-1">
          {fixture.status === "live" ? (
            <LiveBadge />
          ) : (
            <span className="font-mono text-[0.62rem] uppercase tracking-widest text-faint">
              {done ? "Final" : formatMatchTime(fixture.scheduledAt)}
            </span>
          )}
          {showScore ? (
            <span className="tnum font-display text-2xl font-extrabold sm:text-3xl">
              <span className={homeWon ? "text-gold" : "text-fg"}>
                {fixture.home.score}
              </span>
              <span className="mx-1.5 text-faint">:</span>
              <span className={awayWon ? "text-gold" : "text-fg"}>
                {fixture.away.score}
              </span>
            </span>
          ) : (
            <span className="skew mt-1 grid h-7 w-11 place-items-center bg-gold/10 font-display text-xs font-extrabold tracking-widest text-gold">
              <span>VS</span>
            </span>
          )}
          {showScore && homeSeries + awaySeries > 0 ? (
            <span className="tnum font-mono text-[0.62rem] uppercase tracking-widest text-faint" title="Series won">
              {homeSeries} : {awaySeries} series
            </span>
          ) : null}
        </div>

        <Link
          href={`/gnl/teams/${fixture.away.slug}`}
          className="group flex min-w-0 flex-1 items-center justify-end gap-3 text-right"
        >
          <span
            className={cn(
              "font-display text-base font-bold uppercase leading-tight transition-colors group-hover:text-gold max-sm:line-clamp-2 max-sm:text-xs sm:truncate sm:text-lg",
              awayWon || !done ? "text-fg" : "text-muted",
            )}
          >
            {fixture.away.name}
          </span>
          <span className="max-sm:hidden">
            <TeamPlate
              tag={fixture.away.tag}
              logoUrl={fixture.away.logoUrl}
              name={fixture.away.name}
              size="md"
            />
          </span>
        </Link>
      </div>

      {/* Series details toggle */}
      {detailCount > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center gap-2 border-t border-line/60 px-4 py-2 font-mono text-[0.72rem] font-bold uppercase tracking-widest text-muted transition-colors hover:text-gold"
          >
            <ChevronRight
              size={16}
              className={cn(
                "transition-transform duration-[var(--wg-dur)]",
                open && "rotate-90",
              )}
            />
            Series details ({detailCount})
          </button>

          {open ? (
            <div className="bg-bg-deep/40">
              {fixture.matches.map((m) => (
                <DetailRow key={m.id} m={m} />
              ))}
              {fixture.matches.some((m) => m.hasReplays) ? (
                <div className="flex items-center gap-1.5 border-t border-line/40 px-4 py-2.5 text-xs text-arcane">
                  <PlayCircle size={15} /> Replays available for completed games
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
