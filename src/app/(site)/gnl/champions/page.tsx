import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { DataSourceNote } from "@/components/DataSourceNote";
import { TeamPlate } from "@/components/league/VsBadge";
import { PODIUM_PLACES, getChampions } from "@/lib/gnl/champions";
import type { StandingRow } from "@/lib/api/types";
import { record, signed } from "@/lib/figures.mjs";

export const metadata: Metadata = {
  title: "GNL champions",
  description:
    "Every Gym Newbie League podium: the teams that finished first, second and third each season, with their captains, records and the write-up from the day.",
  alternates: { canonical: "/gnl/champions" },
};

/** One step of the podium: the painted cup, the team, its record. */
function Step({ place, row }: { place: (typeof PODIUM_PLACES)[number]; row: StandingRow }) {
  const isChampion = place.rank === 1;
  return (
    <div className={isChampion ? "sm:-mt-4" : ""}>
      <div className="flex flex-col items-center text-center">
        <span className={isChampion ? "relative block size-28 sm:size-36" : "relative block size-20 sm:size-24"}>
          {isChampion ? (
            <span
              aria-hidden
              className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-70 blur-xl"
            />
          ) : null}
          <Image
            src={place.art}
            alt=""
            fill
            sizes={isChampion ? "144px" : "96px"}
            className="object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,.8)]"
            priority={isChampion}
          />
        </span>
        <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-faint">{place.label}</p>
        <div className="mt-3">
          <TeamPlate tag={row.team.tag ?? row.team.name} logoUrl={row.team.logoUrl} name={row.team.name} size={isChampion ? "md" : "sm"} />
        </div>
        <Link
          href={`/gnl/teams/${row.team.slug}`}
          className={
            isChampion
              ? "mt-3 font-display text-lg font-bold uppercase leading-tight tracking-[0.04em] text-fg transition-colors hover:text-gold"
              : "mt-2 font-display text-sm font-bold uppercase leading-tight text-muted transition-colors hover:text-gold"
          }
        >
          {row.team.name}
        </Link>
        {isChampion && row.captains.length ? (
          <p className="mt-1 text-xs text-faint">Captains {row.captains.join(" & ")}</p>
        ) : null}
        <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
          {record(row.wins, row.losses, row.draws)} · {row.points} pts
        </p>
      </div>
    </div>
  );
}

export default async function ChampionsPage() {
  const { champions, source } = await getChampions();
  const [latest, ...rest] = champions;

  return (
    <>
      <PageHeader
        kicker="Gym Newbie League"
        title="Champions"
        lead="Every GNL podium, newest first. Nine seasons, nine trophies."
      />

      <Container className="max-w-4xl py-10">
        <DataSourceNote source={source} />

        {champions.length === 0 ? (
          <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            No seasons have finished yet.
          </p>
        ) : null}

        {/* The most recent season gets the full podium. */}
        {latest ? (
          <Surface className="p-6 pb-8 sm:p-8">
            <p className="kicker text-center">{latest.season.shortName} · Final podium</p>
            <div className="mt-8 grid grid-cols-3 items-start gap-3 sm:gap-6">
              {/* Silver, gold, bronze — the champion stands in the middle and
                  a step higher, which is what a podium looks like. */}
              {[1, 0, 2].map((i) => {
                const place = PODIUM_PLACES[i];
                const row = latest.podium.find((r) => r.rank === place.rank);
                return row ? <Step key={place.rank} place={place} row={row} /> : <div key={place.rank} />;
              })}
            </div>
            {latest.recap ? (
              <p className="mt-8 text-center">
                <Link href={`/blog/${latest.recap.slug}`} className="text-sm font-semibold text-gold hover:underline">
                  Read the write-up →
                </Link>
              </p>
            ) : null}
          </Surface>
        ) : null}

        {/* Earlier seasons: the champion in full, the other two alongside. */}
        {rest.length ? (
          <ul className="mt-4 space-y-3">
            {rest.map((c) => (
              <li key={c.season.number}>
                <Surface className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:p-5">
                  <span className="relative block size-12 shrink-0 sm:size-14">
                    <Image src={PODIUM_PLACES[0].art} alt="" fill sizes="56px" className="object-contain" />
                  </span>
                  <span className="w-16 shrink-0 font-display text-sm font-bold uppercase tracking-[0.1em] text-gold">
                    {c.season.shortName}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/gnl/teams/${c.champion.team.slug}`}
                      className="font-display text-base font-bold uppercase text-fg transition-colors hover:text-gold"
                    >
                      {c.champion.team.name}
                    </Link>
                    {c.champion.captains.length ? (
                      <span className="block text-xs text-faint">Captains {c.champion.captains.join(" & ")}</span>
                    ) : null}
                    {c.podium.length > 1 ? (
                      <span className="mt-1 block text-xs text-faint">
                        {c.podium.slice(1).map((r, i) => (
                          <span key={r.team.slug}>
                            {i > 0 ? " · " : ""}
                            <span className="text-muted">{PODIUM_PLACES[i + 1].label}</span> {r.team.name}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-faint">
                    {record(c.champion.wins, c.champion.losses, c.champion.draws)} · {signed(c.champion.mapDiff)} ·{" "}
                    {c.champion.points} pts
                  </span>
                  {c.recap ? (
                    <Link
                      href={`/blog/${c.recap.slug}`}
                      className="shrink-0 text-xs uppercase tracking-wide text-muted transition-colors hover:text-gold"
                    >
                      Write-up
                    </Link>
                  ) : null}
                </Surface>
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </>
  );
}
