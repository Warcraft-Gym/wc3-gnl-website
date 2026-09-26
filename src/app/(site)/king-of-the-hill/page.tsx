import type { Metadata } from "next";
import { ChevronDown, Crown, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";
import { PortableBody } from "@/components/sanity/PortableBody";
import { FALLBACK, getKothPage } from "@/lib/koth/page";
import { getKothResults } from "@/lib/koth/results";
import { groupByYear, shortDate } from "@/lib/koth/group-by-year";
import { formatNextEvent, isPast } from "@/lib/koth/next-event.mjs";

export const metadata: Metadata = {
  title: "King of the Hill",
  description:
    "The Gym's casual weekly King of the Hill: best-of-one, winner stays on, three MMR brackets. When the next one runs, who holds each crown, and how to join.",
  alternates: { canonical: "/king-of-the-hill" },
};

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

  const intro = page?.intro || FALLBACK.intro;
  const streamUrl = page?.streamUrl || FALLBACK.streamUrl;
  const streamName = streamUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const kings = page?.kings ?? [];

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
            </>
          ) : (
            <p className="mt-4 text-muted">
              The next one is not scheduled yet. Ask in the Discord, or watch the stream — it usually runs weekly.
            </p>
          )}
          <div className="mt-6">
            <ButtonLink href={streamUrl} size="sm" target="_blank" rel="noreferrer">
              Watch on {streamName} <ExternalLink size={15} />
            </ButtonLink>
          </div>
        </Surface>

        {/* Current kings — hidden entirely when nobody is set, rather than
            showing a crown with a blank under it or last season's holder. */}
        {kings.length ? (
          <Surface className="p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold uppercase">Current kings</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {kings.map((k) => (
                <li
                  key={k._key ?? `${k.bracket}-${k.player}`}
                  className="flex items-center gap-3 rounded border border-line bg-surface/50 px-4 py-3"
                >
                  <Crown size={18} className="shrink-0 text-gold" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-display font-bold uppercase text-fg">{k.player}</span>
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
              {crownings} crowns across {results.length} events, from{" "}
              {shortDate(results[results.length - 1].date)} {years[years.length - 1].year} to{" "}
              {shortDate(results[0].date)} {years[0].year}.
            </p>

            <div className="mt-6 space-y-2">
              {years.map((y, i) => (
                <details key={y.year} open={i === 0} className="group border border-line bg-surface/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50 [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-base font-bold uppercase tracking-[0.06em] text-fg">{y.year}</span>
                    <span className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-faint">
                      {y.results.length} {y.results.length === 1 ? "event" : "events"} · {y.crownings} crowned
                      <ChevronDown size={14} className="ml-2 inline align-[-2px] transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <ul className="border-t border-line/60">
                    {y.results.map((r) => (
                      <li
                        key={r.date}
                        className="flex flex-col gap-1.5 border-b border-line/40 px-4 py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-4"
                      >
                        <span className="w-16 shrink-0 font-mono text-xs text-faint">{shortDate(r.date)}</span>
                        {r.winners.length ? (
                          <span className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
                            {r.winners.map((w) => (
                              <span key={`${w.bracket}-${w.player}`} className="text-sm">
                                <Crown size={12} className="mr-1.5 inline align-[-1px] text-gold/70" aria-hidden />
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
