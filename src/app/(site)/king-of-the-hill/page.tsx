import type { Metadata } from "next";
import Image from "next/image";
import { ChevronDown, Crown, ExternalLink } from "lucide-react";
import { TwitchIcon } from "@/components/ui/TwitchIcon";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";
import { PortableBody } from "@/components/sanity/PortableBody";
import { FALLBACK, getKothPage } from "@/lib/koth/page";
import { getKothResults } from "@/lib/koth/results";
import { groupByYear, shortDate } from "@/lib/koth/group-by-year";
import { currentKings } from "@/lib/koth/current-kings";
import { bracketArt } from "@/lib/koth/bracket-art";
import { mostCrowns, topFirst } from "@/lib/koth/crowns";
import { Meter } from "@/components/ui/Meter";
import { Flag } from "@/components/ui/Flag";
import { formatNextEvent, isPast } from "@/lib/koth/next-event";
import { LocalEventTime } from "@/components/koth/LocalEventTime";
import { pageMetadata } from "@/lib/share-metadata.mjs";

export const metadata: Metadata = pageMetadata({
  title: "King of the Hill",
  description:
    "The Gym's casual weekly King of the Hill: best-of-one, winner stays on, three MMR brackets. When the next one runs, who holds each crown, and how to join.",
  path: "/king-of-the-hill",
});

/** A bulleted list, used for the built-in copy when the CMS has none. The CMS
 *  version of the same section comes through `PortableBody` instead. */
function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((p) => (
        <li key={p} className="flex gap-3 text-muted">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rotate-45 bg-gold" />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function KingOfTheHillPage() {
  const [page, results] = await Promise.all([getKothPage(), getKothResults()]);
  const years = groupByYear(results);
  const crownings = years.reduce((n, y) => n + y.crownings, 0);
  const crowned = mostCrowns(results);
  const leaders = crowned.slice(0, 8);

  const intro = page?.intro || FALLBACK.intro;
  const streamUrl = page?.streamUrl || FALLBACK.streamUrl;
  const streamName = streamUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  // Read from the results rather than a field someone has to remember to
  // update: the old page's hand-kept kings contradicted its own results.
  const reigning = currentKings(results);

  // Only a date that is set *and* still ahead of us is a "next event". A past
  // one is worse than none: the old page spent a year advertising a KotH that
  // had already happened.
  const next = page?.nextEventAt && !isPast(page.nextEventAt) ? formatNextEvent(page.nextEventAt) : null;

  return (
    <>
      <PageHeader
        kicker="Community"
        title={page?.title || FALLBACK.title}
        lead={intro}
        art="/graphics/koth-crown-peak-1.png"
      />

      <Container className="max-w-3xl space-y-4 py-10">
        {/* When and where */}
        <Surface className="p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold uppercase">Next King of the Hill</h2>
          {next ? (
            <>
              <p className="mt-4 text-lg text-fg">{next.day}</p>
              <p className="mt-1 text-muted">
                {next.times.map((t, i) => (
                  <span key={t.label}>
                    {i > 0 ? " · " : ""}
                    {t.time} <span className="text-faint">{t.label}</span>
                  </span>
                ))}
              </p>
              {/* Only the browser knows where the reader is. Renders nothing
                  on the server, and nothing at all for a reader already in one
                  of the three zones above. */}
              <LocalEventTime iso={page!.nextEventAt!} />
            </>
          ) : (
            <p className="mt-4 text-muted">
              The next one is not scheduled yet. Ask in the Discord, or watch the stream. It usually runs weekly.
            </p>
          )}
          <div className="mt-6 flex justify-center">
            <ButtonLink href={streamUrl} variant="twitch" size="md" target="_blank" rel="noreferrer">
              <TwitchIcon /> Watch on {streamName} <ExternalLink size={15} />
            </ButtonLink>
          </div>
        </Surface>

        {/* Current kings — hidden entirely when nobody is set, rather than
            showing a crown with a blank under it or last season's holder. */}
        {reigning ? (
          <Surface className="p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-display text-xl font-bold uppercase">Current kings</h2>
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-faint">
                Crowned {shortDate(reigning.date)} {reigning.date.slice(0, 4)}
              </p>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reigning.kings.map((k) => (
                <li
                  key={`${k.bracket}-${k.player}`}
                  className="flex flex-col items-center gap-2 rounded border border-line bg-surface/50 px-4 py-5 text-center"
                >
                  {/* The crown is the point of the page, so it is the painted
                      emblem rather than a line icon — same treatment the
                      champions podium gives its cups. Which of the three a
                      bracket gets is read from its label, so it does not move
                      when the Studio list is reordered or renamed. */}
                  <span className="relative block size-20 shrink-0 sm:size-24">
                    <span
                      aria-hidden
                      className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-60 blur-xl"
                    />
                    <Image
                      src={bracketArt(k.bracket)}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,.8)]"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-base font-bold uppercase text-fg">
                      <Flag code={k.country ?? undefined} className="mr-1.5" />
                      {k.player}
                    </span>
                    <span className="block text-xs text-faint">{k.bracket}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Surface>
        ) : null}

        {/* Who can join */}
        <Surface className="p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold uppercase">Who can join, and how</h2>
          {page?.joining?.length ? (
            <div className="prose-invert mt-4 max-w-none">
              <PortableBody value={page.joining as never} />
            </div>
          ) : (
            <Bullets items={FALLBACK.joining} />
          )}
        </Surface>

        {/* Rules */}
        <Surface className="p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold uppercase">Rules</h2>
          {page?.rules?.length ? (
            <div className="prose-invert mt-4 max-w-none">
              <PortableBody value={page.rules as never} />
            </div>
          ) : (
            <Bullets items={FALLBACK.rules} />
          )}
          {page?.updatedAt ? (
            <p className="mt-6 text-xs text-faint">
              Page last changed{" "}
              {new Date(page.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          ) : null}
        </Surface>

        {/* Past winners. Five years is too long for one list, so each year is
            a <details> — the newest open, the rest a click away. No JavaScript:
            the browser does the disclosure. */}
        {years.length ? (
          <Surface className="p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold uppercase">Past winners</h2>
            <p className="mt-2 text-sm text-muted">
              {crownings} crowns over {results.length} nights, {shortDate(results[results.length - 1].date)}{" "}
              {years[years.length - 1].year} to {shortDate(results[0].date)} {years[0].year}. {crowned.length} players have
              worn one.
            </p>

            {/* Who has worn the most: one bar per player in the brand hue, the
                figure beside it as text. Counted from the nights listed below. */}
            {leaders.length ? (
              <>
                <h3 className="mt-7 font-display text-base font-bold uppercase tracking-[0.06em]">Most crowns</h3>
                <p className="mt-1 text-xs text-faint">One a night, however many brackets a player won.</p>
                <ol className="mt-3 space-y-1.5">
                  {leaders.map((p, i) => (
                    <li
                      key={`${i}-${p.player}`}
                      className="grid grid-cols-[1.25rem_minmax(0,7.5rem)_1fr_2rem] items-center gap-x-3 text-sm sm:grid-cols-[1.25rem_minmax(0,10rem)_1fr_2rem_4.5rem]"
                    >
                      <span className="tnum text-right text-xs text-faint">{i + 1}</span>
                      {/* Every row keeps the flag's slot, so the names line up with or without one */}
                      <span className="truncate text-fg">
                        <span className="mr-1.5 inline-block w-4">
                          <Flag code={p.country ?? undefined} />
                        </span>
                        {p.player}
                      </span>
                      <Meter
                        value={p.crowns}
                        max={leaders[0].crowns}
                        label={`${p.player}, crowned on ${p.crowns} ${p.crowns === 1 ? "night" : "nights"}`}
                        hue="bg-gold"
                      />
                      <span className="tnum text-right text-fg">{p.crowns}</span>
                      <span className="hidden font-mono text-[0.66rem] uppercase tracking-[0.14em] text-faint sm:inline">
                        {p.first === p.last ? p.first : `${p.first}–${p.last}`}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}

            <h3 className="mt-7 font-display text-base font-bold uppercase tracking-[0.06em]">Every night</h3>

            <div className="mt-3 space-y-2">
              {years.map((y, i) => (
                <details key={y.year} open={i === 0} className="group border border-line bg-surface/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50 [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-base font-bold uppercase tracking-[0.06em] text-fg">{y.year}</span>
                    <span className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-faint">
                      {y.results.length} {y.results.length === 1 ? "night" : "nights"} · {y.crownings} crowned
                      <ChevronDown size={14} className="ml-2 inline align-[-2px] transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <ul className="border-t border-line/60">
                    {y.results.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-col gap-1.5 border-b border-line/40 px-4 py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-4"
                      >
                        <span className="w-16 shrink-0 font-mono text-xs text-faint">{shortDate(r.date)}</span>
                        {r.winners.length ? (
                          <span className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
                            {topFirst(r.winners).map((w) => (
                              <span key={`${w.bracket}-${w.player}`} className="text-sm">
                                <Crown size={12} className="mr-1.5 inline align-[-1px] text-gold/70" aria-hidden />
                                <Flag code={w.country ?? undefined} className="mr-1.5" />
                                <span className="text-fg">{w.player}</span>{" "}
                                <span className="text-faint">{w.bracket}</span>
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-sm text-faint">Winners were not recorded.</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </Surface>
        ) : null}
      </Container>
    </>
  );
}
