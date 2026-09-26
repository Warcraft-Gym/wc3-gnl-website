import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { DataSourceNote } from "@/components/DataSourceNote";
import { TeamPlate } from "@/components/league/VsBadge";
import { PODIUM_PLACES, getChampions, type SeasonPodium } from "@/lib/gnl/champions";
import type { StandingRow } from "@/lib/api/types";
import { record } from "@/lib/figures.mjs";
import { cn } from "@/lib/utils";
import { parseSeasonParam, type SeasonSearchParams } from "@/lib/api/season-params";

type Props = { searchParams: Promise<SeasonSearchParams> };

const ALL_DESCRIPTION =
  "Every Gym Newbie League podium: the teams that finished first, second and third each season, with their captains, records and the write-up from the day.";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { champions } = await getChampions();
  const shown = selectSeason(champions, parseSeasonParam((await searchParams).season));
  if (!shown) {
    return { title: "GNL champions", description: ALL_DESCRIPTION, alternates: { canonical: "/gnl/champions" } };
  }
  // No param is the newest season, the same convention the rest of the league
  // pages follow — so the newest season's canonical is the bare path, not a
  // second URL showing identical content.
  const isLatest = shown.season.number === champions[0]?.season.number;
  return {
    title: `${shown.season.shortName} champions`,
    description: `${shown.champion.team.name} won ${shown.season.shortName} of the Gym Newbie League. The final podium, with records and the write-up from the day.`,
    alternates: { canonical: isLatest ? "/gnl/champions" : `/gnl/champions?season=${shown.season.number}` },
  };
}

/** The season to show: the one asked for, or the newest. An unknown or
 *  malformed number falls back to the newest rather than an empty page —
 *  the same rule the other league pages follow for a bad param. */
function selectSeason(champions: SeasonPodium[], requested: number | undefined) {
  return (requested ? champions.find((c) => c.season.number === requested) : undefined) ?? champions[0];
}

/** One step of a podium: the painted cup, the team crest, the record.
 *
 * `featured` is the most recent season, which is drawn larger. Everything
 * else about the two is the same, so a reader scanning down the page reads
 * each season the same way. */
function Step({
  place,
  row,
  featured,
}: {
  place: (typeof PODIUM_PLACES)[number];
  row: StandingRow;
  featured: boolean;
}) {
  const isChampion = place.rank === 1;
  const cup = featured
    ? isChampion
      ? "size-28 sm:size-36"
      : "size-20 sm:size-24"
    : isChampion
      ? "size-20 sm:size-24"
      : "size-14 sm:size-16";

  return (
    <div className={isChampion ? "flex flex-col items-center text-center sm:-mt-4" : "flex flex-col items-center text-center"}>
      <span className={`relative block ${cup}`}>
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
          sizes={featured && isChampion ? "144px" : "96px"}
          className="object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,.8)]"
          priority={featured && isChampion}
        />
      </span>

      <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-faint">{place.label}</p>

      <div className="mt-3">
        <TeamPlate
          tag={row.team.tag ?? row.team.name}
          logoUrl={row.team.logoUrl}
          name={row.team.name}
          size={isChampion ? "lg" : "md"}
        />
      </div>

      <Link
        href={`/gnl/teams/${row.team.slug}`}
        className={
          isChampion
            ? "mt-3 font-display text-base font-bold uppercase leading-tight tracking-[0.04em] text-fg transition-colors hover:text-gold sm:text-lg"
            : "mt-2 font-display text-sm font-bold uppercase leading-tight text-muted transition-colors hover:text-gold"
        }
      >
        {row.team.name}
      </Link>

      {isChampion && row.captains.length ? (
        <p className="mt-1 text-xs text-faint">Captains {row.captains.join(" & ")}</p>
      ) : null}

      <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint">
        {record(row.wins, row.losses, row.draws)} · {row.points} pts
      </p>
    </div>
  );
}

/** A season's podium. Silver, gold, bronze — the champion in the middle and
 *  a step higher, which is what a podium looks like. */
function Podium({ entry, featured }: { entry: SeasonPodium; featured: boolean }) {
  return (
    <Surface className={featured ? "p-6 pb-8 sm:p-8" : "p-5 pb-6 sm:p-6"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="kicker">
          {entry.season.shortName}
          {featured ? " · Final podium" : ""}
        </p>
        {entry.recap ? (
          <Link
            href={`/blog/${entry.recap.slug}`}
            className="text-xs uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            Write-up →
          </Link>
        ) : null}
      </div>

      <div className={featured ? "mt-8 grid grid-cols-3 items-start gap-3 sm:gap-6" : "mt-6 grid grid-cols-3 items-start gap-3 sm:gap-5"}>
        {[1, 0, 2].map((i) => {
          const place = PODIUM_PLACES[i];
          const row = entry.podium.find((r) => r.rank === place.rank);
          return row ? <Step key={place.rank} place={place} row={row} featured={featured} /> : <div key={place.rank} />;
        })}
      </div>
    </Surface>
  );
}

export default async function ChampionsPage({ searchParams }: Props) {
  const { champions, source } = await getChampions();
  const shown = selectSeason(champions, parseSeasonParam((await searchParams).season));

  return (
    <>
      <PageHeader
        kicker="Gym Newbie League"
        title={shown ? `${shown.season.shortName} champions` : "Champions"}
        lead={
          shown
            ? `${shown.champion.team.name} took the title. The final podium for ${shown.season.shortName}.`
            : "No seasons have finished yet."
        }
      />

      <Container className="max-w-4xl py-10">
        <DataSourceNote source={source} />


        {shown ? (
          <Podium entry={shown} featured />
        ) : (
          <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            No seasons have finished yet.
          </p>
        )}

        {/* Every champion, so the roll of honour is one click from any season
            rather than something you have to know the URL for. */}
        {champions.length > 1 ? (
          <section className="mt-10">
            <h2 className="kicker">Every champion</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {champions.map((c) => {
                const active = c.season.number === shown?.season.number;
                return (
                  <li key={c.season.number}>
                    <Link
                      href={c.season.number === champions[0].season.number ? "/gnl/champions" : `/gnl/champions?season=${c.season.number}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded border px-3 py-2.5 transition-colors",
                        active
                          ? "border-gold/60 bg-gold/10"
                          : "border-line bg-surface/50 hover:border-gold/50 hover:bg-surface-2/50",
                      )}
                    >
                      <span className="relative block size-8 shrink-0">
                        <Image src={PODIUM_PLACES[0].art} alt="" fill sizes="32px" className="object-contain" />
                      </span>
                      <span className="w-14 shrink-0 font-display text-xs font-bold uppercase tracking-[0.1em] text-gold">
                        {c.season.shortName}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-display text-sm font-bold uppercase text-fg">
                        {c.champion.team.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}
