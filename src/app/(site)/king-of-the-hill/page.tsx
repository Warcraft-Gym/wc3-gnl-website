import type { Metadata } from "next";
import { Crown, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";
import { PortableBody } from "@/components/sanity/PortableBody";
import { FALLBACK, getKothPage } from "@/lib/koth/page";
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
  const page = await getKothPage();

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
      </Container>
    </>
  );
}
