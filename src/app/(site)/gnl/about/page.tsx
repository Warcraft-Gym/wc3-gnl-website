import type { Metadata } from "next";
import Image from "next/image";
import { PortableText } from "@portabletext/react";
import { ArrowRight, Swords, GraduationCap, Users2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";
import { getAboutPage } from "@/lib/content/about";

export const metadata: Metadata = {
  title: "About the GNL",
  description:
    "The Gym Newbie League is a team league with solo matches, created by the Gym Discord community for new and veteran players alike — skill level doesn't matter.",
};

const BENEFIT_ICONS = [Swords, GraduationCap, Users2];

/** Renders Sanity Portable Text, or plain-string fallback paragraphs. */
function RichText({ value }: { value: unknown[] }) {
  if (!value?.length) return null;
  const first = value[0];
  const isPortableText =
    typeof first === "object" && first !== null && "_type" in first;
  if (isPortableText) {
    return <PortableText value={value as never} />;
  }
  return (
    <>
      {(value as string[]).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}

export default async function AboutPage() {
  const about = await getAboutPage();

  return (
    <>
      <PageHeader kicker={about.kicker} title={about.title} lead={about.lead} />

      <Container className="py-10">
        {/* Intro */}
        <div className="max-w-3xl space-y-5 text-[1.075rem] leading-8 text-muted [&_strong]:text-fg">
          <RichText value={about.intro} />
        </div>

        {/* Excellent choice */}
        <figure className="mt-10 flex justify-center">
          <Image
            src="/graphics/excellent-choice.png"
            alt="Excellent choice"
            width={1291}
            height={851}
            className="h-auto w-full max-w-2xl"
            sizes="(max-width: 768px) 100vw, 42rem"
          />
        </figure>

        {/* Why play */}
        <section className="mt-14">
          <p className="kicker mb-6">Why play</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {about.benefits.map((b, i) => {
              const Icon = BENEFIT_ICONS[i] ?? Swords;
              return (
                <Surface key={b.title} className="p-6">
                  <span className="skew grid size-11 place-items-center bg-gold/10 text-gold">
                    <Icon
                      size={20}
                      className="[transform:skewX(calc(var(--wg-skew)*-1))]"
                    />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold uppercase text-fg">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted">{b.body}</p>
                </Surface>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-16">
          <p className="kicker mb-6">How a season works</p>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {about.steps.map((s, i) => (
              <Surface key={s.title} as="li" className="p-6">
                <span className="tnum font-display text-3xl font-extrabold text-gold/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold uppercase text-fg">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </Surface>
            ))}
          </ol>
        </section>

        {/* Cadence */}
        <section className="mt-16 max-w-3xl space-y-5 text-[1.075rem] leading-8 text-muted [&_strong]:text-fg">
          <p className="kicker mb-2">Season cadence</p>
          <RichText value={about.cadence} />
        </section>

        {/* CTA */}
        <div className="mt-14 flex flex-wrap gap-3">
          <ButtonLink href="https://discord.gg/7HUyQAKQ8p" size="lg">
            Join the Gym Discord <ArrowRight size={18} />
          </ButtonLink>
          <ButtonLink href="/gnl/rules" variant="outline" size="lg">
            Read the full rules
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
