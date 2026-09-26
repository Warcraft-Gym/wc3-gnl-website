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
import { parseSeasonParam, type SeasonSearchParams } from "@/lib/api/season-params";

type Props = { searchParams: Promise<SeasonSearchParams> };

const ALL_DESCRIPTION =
  "Every Gym Newbie League podium: the teams that finished first, second and third each season, with their captains, records and the write-up from the day.";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  // The season pill in the GNL sub-nav links here with `?season=N`, so the
  // filtered view is a real page a reader can land on or share, and it says
  // which season it is rather than inheriting the index's title.
  const requested = parseSeasonParam((await searchParams).season);
  const { champions } = await getChampions();
  const one = requested ? champions.find((c) => c.season.number === requested) : undefined;

  if (!one) {
    return {
      title: "GNL champions",
      description: ALL_DESCRIPTION,
      alternates: { canonical: "/gnl/champions" },
    };
  }
  return {
    title: `${one.season.shortName} champions`,
    description: `${one.champion.team.name} won ${one.season.shortName} of the Gym Newbie League. The final podium, with records and the write-up from the day.`,
    alternates: { canonical: `/gnl/champions?season=${one.season.number}` },
  };
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

  // An unknown or malformed season shows everything rather than an empty
  // page — the same rule the other league pages follow for a bad param.
  const requested = parseSeasonParam((await searchParams).season);
  const one = requested ? champions.find((c) => c.season.number === requested) : undefined;
  const shown = one ? [one] : champions;

  return (
    <>
      <PageHeader
        kicker="Gym Newbie League"
        title={one ? `${one.season.shortName} champions` : "Champions"}
        lead={
          one
            ? `${one.champion.team.name} took the title. The final podium for ${one.season.shortName}.`
            : `Every GNL podium, newest first. ${champions.length} seasons, ${champions.length} trophies.`
        }
      />

      <Container className="max-w-4xl py-10">
        <DataSourceNote source={source} />

        {one ? (
          <p className="mb-6">
            <Link href="/gnl/champions" className="text-sm text-muted transition-colors hover:text-gold">
              ← Every season
            </Link>
          </p>
        ) : null}

        {champions.length === 0 ? (
          <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            No seasons have finished yet.
          </p>
        ) : (
          <div className="space-y-4">
            {shown.map((entry, i) => (
              <Podium key={entry.season.number} entry={entry} featured={i === 0} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
