"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, PlayCircle } from "lucide-react";
import type { TeamFixture, PlayerMatch } from "@/lib/api/types";
import { LiveBadge } from "@/components/ui/Badge";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { TeamPlate } from "./VsBadge";
import { cn, raceOf, formatMatchTime } from "@/lib/utils";

function gameTime(iso?: string) {
  if (!iso) return { day: "TBD", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "TBD", time: "" };
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
  const { day, time } = gameTime(m.scheduledAt);
  const homeWon = m.status === "completed" && m.home.score > m.away.score;
  const awayWon = m.status === "completed" && m.away.score > m.home.score;
  const played = m.status !== "scheduled";

  return (
    <div className="grid grid-cols-[5.5rem_1fr_auto_1fr] items-center gap-2 border-t border-line/40 px-4 py-2.5 text-sm sm:grid-cols-[7rem_1fr_auto_1fr]">
      <div className="font-mono text-[0.7rem] leading-tight text-faint">
        <div>{day}</div>
        <div>{time}</div>
      </div>

      <div className="flex items-center gap-2 truncate">
        <RaceIcon race={raceOf(m.home.race)} size={22} />
        <span
          className={cn(
            "truncate font-semibold",
            homeWon || !played ? "text-fg" : "text-muted",
          )}
        >
          {m.home.playerName}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2">
        {m.status === "live" ? (
          <span className="live-dot size-1.5 rounded-full bg-live" aria-hidden />
        ) : null}
        <span className="tnum whitespace-nowrap font-display text-base font-extrabold">
          {played ? (
            <>
              <span className={homeWon ? "text-gold" : "text-faint"}>
                {m.home.score}
              </span>
              <span className="mx-1 text-faint">-</span>
              <span className={awayWon ? "text-gold" : "text-faint"}>
                {m.away.score}
              </span>
            </>
          ) : (
            <span className="text-faint">vs</span>
          )}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 truncate text-right">
        <span
          className={cn(
            "truncate font-semibold",
            awayWon || !played ? "text-fg" : "text-muted",
          )}
        >
          {m.away.playerName}
        </span>
        <RaceIcon race={raceOf(m.away.race)} size={22} />
      </div>
    </div>
  );
}

export function FixtureRow({ fixture }: { fixture: TeamFixture }) {
  const done = fixture.status === "completed";
  const [open, setOpen] = useState(fixture.status === "live");
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
          <TeamPlate
            tag={fixture.home.tag}
            logoUrl={fixture.home.logoUrl}
            name={fixture.home.name}
            size="md"
          />
          <span
            className={cn(
              "truncate font-display text-base font-bold uppercase transition-colors group-hover:text-gold sm:text-lg",
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
              <span className="mx-1.5 text-faint">-</span>
              <span className={awayWon ? "text-gold" : "text-fg"}>
                {fixture.away.score}
              </span>
            </span>
          ) : (
            <span className="skew mt-1 grid h-7 w-11 place-items-center bg-gold/10 font-display text-xs font-extrabold tracking-widest text-gold">
              <span>VS</span>
            </span>
          )}
        </div>

        <Link
          href={`/gnl/teams/${fixture.away.slug}`}
          className="group flex min-w-0 flex-1 items-center justify-end gap-3 text-right"
        >
          <span
            className={cn(
              "truncate font-display text-base font-bold uppercase transition-colors group-hover:text-gold sm:text-lg",
              awayWon || !done ? "text-fg" : "text-muted",
            )}
          >
            {fixture.away.name}
          </span>
          <TeamPlate
            tag={fixture.away.tag}
            logoUrl={fixture.away.logoUrl}
            name={fixture.away.name}
            size="md"
          />
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
              size={14}
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
                  <PlayCircle size={13} /> Replays available for completed games
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
