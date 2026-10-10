import type { Metadata } from "next";
import Image from "next/image";
import { Download, GraduationCap, Repeat, Swords } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { TRAINING_GROUNDS_DOWNLOAD_URL } from "@/lib/training-grounds";
import { pageMetadata } from "@/lib/share-metadata.mjs";

export const metadata: Metadata = pageMetadata({
  path: "/tools/training-grounds",
  title: "Jamie's Training Grounds",
  description:
    "A Warcraft III custom map by Solanum that teaches the game from zero and drills the hard skills: camera, unit control, hotkeys and economy tutorials, plus repeatable trainings for body blocking, surrounds, dodging, windwalk pops and more.",
  shareDescription: "Learn Warcraft III from zero, then drill body blocks, surrounds and dodges on repeat.",
  images: [{ url: "/og/training-grounds.jpg", width: 1200, height: 630 }],
});

const POINTS = [
  {
    Icon: GraduationCap,
    title: "Learn to play",
    body: "Tutorials for brand new players that explain each mechanic and let you try it on the spot, then move on when you are ready.",
  },
  {
    Icon: Repeat,
    title: "Skill training",
    body: "Set up a situation, try it, reset and go again. Every training explains how the mechanic works and how the skill is done.",
  },
  {
    Icon: Swords,
    title: "Advanced play",
    body: "Planned: the things that matter once you start playing ladder, like scouting, handling creep abilities and creeping with an Ancient of War.",
  },
];

type Module = { name: string; planned?: boolean };

const MODULES: { title: string; blurb: string; items: Module[] }[] = [
  {
    title: "Learn to Play",
    blurb: "Zero-level tutorials, about an hour for the full set once it is done.",
    items: [
      { name: "Camera" },
      { name: "Unit Controls" },
      { name: "Hotkey Setup" },
      { name: "Economy & Workers" },
      { name: "Heroes", planned: true },
      { name: "Combat", planned: true },
      { name: "Creeping", planned: true },
      { name: "The Base", planned: true },
    ],
  },
  {
    title: "Skill Training",
    blurb: "Short drills you can reset and repeat as often as you like.",
    items: [
      { name: "Body Blocking" },
      { name: "Surrounds" },
      { name: "Dodging" },
      { name: "Gargoyle Surrounds" },
      { name: "Windwalk Pop" },
      { name: "Mining Micro" },
      { name: "Bat Splitting" },
      { name: "Zeppelin Micro", planned: true },
      { name: "Peon Micro", planned: true },
      { name: "Wisp Micro", planned: true },
      { name: "Combat Micro", planned: true },
      { name: "Staffing Units", planned: true },
      { name: "Reflex Training", planned: true },
    ],
  },
];

const STEPS = [
  "Download the map and put it in your Warcraft III Maps folder.",
  "Open it from Single Player, then Custom Game.",
  "Pick a tutorial or a drill, and hit Redo to go again.",
];

function ModuleList({ items }: { items: Module[] }) {
  return (
    <ul className="mt-4 space-y-1.5 text-sm">
      {items.map(({ name, planned }) => (
        <li key={name} className="flex items-baseline gap-2">
          <span className={planned ? "text-faint" : "text-gold"}>·</span>
          <span className={planned ? "text-faint" : "text-fg"}>{name}</span>
          {planned ? (
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">Planned</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function TrainingGroundsPage() {
  return (
    <>
      <PageHeader
        kicker="Tools · Custom map"
        title="Jamie's Training Grounds"
        lead="One map to learn Warcraft III from zero and to drill the skills that win games. Tutorials for new players, trainings for everyone, and you can reset and repeat any of it."
      >
        <ButtonLink href={TRAINING_GROUNDS_DOWNLOAD_URL} size="md">
          <Download size={18} /> Download the map
        </ButtonLink>
      </PageHeader>

      <Container className="py-10">
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
          By Solanum, from an idea by Jamie · Work in progress
        </p>

        {/* The main menu, with a drill in play tucked over its corner */}
        <figure className="relative mt-4 sm:mb-24">
          <Image
            src="/training-grounds/main-menu.webp"
            alt="The map's main menu: Learn to Play, Advanced Play, Skill Training and Tools & Extras, with Credits and Patch Notes below."
            width={1920}
            height={1080}
            priority
            sizes="(max-width: 640px) 100vw, 72rem"
            className="h-auto w-full rounded border border-line shadow-[0_24px_60px_-20px_rgba(0,0,0,.9)]"
          />
          {/* Phones stack the second shot under the first; wider screens tuck it over the corner */}
          <Image
            src="/training-grounds/body-blocking.webp"
            alt="The body blocking drill: a Mountain King and footmen trap a Grunt between a start and a finish line, with a Redo button at the top."
            width={1920}
            height={1080}
            sizes="(max-width: 640px) 100vw, 26rem"
            className="mt-4 h-auto w-full rounded border border-line shadow-[0_24px_60px_-12px_rgba(0,0,0,.95)] sm:absolute sm:-bottom-16 sm:right-[-3%] sm:mt-0 sm:w-[26rem]"
          />
          <figcaption className="mt-3 text-sm text-muted sm:absolute sm:-bottom-16 sm:left-0 sm:mt-0 sm:max-w-[45%]">
            Pick a tutorial or a drill from one menu, then play it out. Here, body blocking: stop the Grunt before it reaches the finish.
          </figcaption>
        </figure>

        <ul className="mt-14 grid gap-4 sm:grid-cols-3">
          {POINTS.map(({ Icon, title, body }) => (
            <li key={title} className="panel p-5">
              <Icon size={20} className="text-arcane" />
              <p className="mt-2 font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-fg">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ul>

        <section className="mt-14">
          <p className="kicker mb-5">What is in the map</p>
          <div className="grid gap-4 md:grid-cols-2">
            {MODULES.map(({ title, blurb, items }) => (
              <div key={title} className="panel p-6">
                <h2 className="font-display text-lg font-bold uppercase text-fg">{title}</h2>
                <p className="mt-1 text-sm text-muted">{blurb}</p>
                <ModuleList items={items} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-2">
          <figure>
            <Image
              src="/training-grounds/camera-tutorial.webp"
              alt="The camera tutorial in an Orc base, with a welcome message and Next, Topics and Pause buttons at the top of the screen."
              width={1920}
              height={1080}
              sizes="(max-width: 768px) 100vw, 36rem"
              className="h-auto w-full rounded border border-line"
            />
            <figcaption className="mt-3 text-sm text-muted">
              Tutorials explain a mechanic, let you play with it, and move on when you press Next.
            </figcaption>
          </figure>
          <figure>
            <Image
              src="/training-grounds/skill-training.webp"
              alt="The Skill Training menu: Body Blocking, Surrounds, Dodging, Mining Micro, Bat Splitting, Gargoyle Surrounds and Windwalk Pop, with more drills marked as planned."
              width={1920}
              height={1080}
              sizes="(max-width: 768px) 100vw, 36rem"
              className="h-auto w-full rounded border border-line"
            />
            <figcaption className="mt-3 text-sm text-muted">
              Skill Training: pick a drill, and hit Redo to try it again as often as you like.
            </figcaption>
          </figure>
        </section>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <section>
            <p className="kicker mb-4">Get started</p>
            <ol className="space-y-4">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-4">
                  <span className="btn-gold grid size-8 shrink-0 place-items-center rounded font-display text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-6 text-muted">{s}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="panel border-arcane/40 p-6">
            <p className="kicker">Where it is going</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li className="flex gap-2"><span className="text-gold">·</span> Finish the Learn to Play set, so any player can learn every basic part of the game in about an hour.</li>
              <li className="flex gap-2"><span className="text-gold">·</span> A skill training for anything that gets better with fast, repeatable practice. Have an idea? Tell Solanum.</li>
              <li className="flex gap-2"><span className="text-gold">·</span> Advanced Play tutorials for ladder: scouting, the finer points of creeping, Ancient of War creeping and more.</li>
            </ul>
          </section>
        </div>
      </Container>
    </>
  );
}
