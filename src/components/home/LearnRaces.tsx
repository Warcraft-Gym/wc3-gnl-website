import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ListOrdered } from "lucide-react";
import { LEARN_CATEGORIES, type LearnCategory } from "@/lib/learn/data";
import { learnArt } from "@/lib/learn/art";
import { ButtonLink } from "@/components/ui/Button";

/** Emblem + title + blurb, linking to a Learn hub. */
function LearnEmblem({ category }: { category: LearnCategory }) {
  const art = learnArt(category);
  return (
    <Link
      href={`/learn/${category.id}`}
      className="group flex flex-col items-center text-center"
    >
      <span className="relative block aspect-square w-full max-w-[7.5rem] sm:max-w-[11rem] transition-transform duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5">
        {/* Glow behind the emblem, brightens on hover */}
        <span
          aria-hidden
          className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-50 blur-xl transition-opacity duration-[var(--wg-dur)] group-hover:opacity-100"
        />
        {art ? (
          <Image
            src={art}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, 176px"
            className="object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,.85)]"
          />
        ) : null}
      </span>
      <span className="mt-3 font-display text-[0.7rem] font-bold uppercase leading-tight tracking-[0.12em] sm:mt-4 sm:text-[0.8rem] sm:tracking-[0.14em] text-fg transition-colors group-hover:text-gold">
        {category.title}
      </span>
      <span className="mt-1 max-w-[11rem] text-xs text-muted max-sm:hidden">{category.blurb}</span>
    </Link>
  );
}

/** "Races" section, Learn edition: the four race crests, then the three
 *  topic emblems, each linking to its guides. */
export function LearnRaces() {
  const races = LEARN_CATEGORIES.filter((c) => c.kind === "race");
  const topics = LEARN_CATEGORIES.filter((c) => c.kind === "topic");

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-14">
      <div>
        <p className="kicker">Learn</p>
        <h2 className="mt-3 whitespace-nowrap text-[clamp(1.55rem,0.9rem+1.75vw,2.35rem)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
          Learn Warcraft III
        </h2>
        <p className="mt-5 max-w-md text-lg text-muted">
          Build orders, creep routes and game mechanics written by Gym coaches
          for players who want to get better, from your very first ladder
          game to preparing for a GNL season. Pick your race and start with the
          beginner guides.
        </p>
        <div className="mt-7">
          <ButtonLink href="/learn" size="md">
            Browse the guides <ArrowRight size={16} />
          </ButtonLink>
        </div>
      </div>

      <div>
        <ul className="grid grid-cols-4 gap-x-2 gap-y-6 sm:gap-x-6 sm:gap-y-8">
          {races.map((c) => (
            <li key={c.id}>
              <LearnEmblem category={c} />
            </li>
          ))}
        </ul>

        <ul className="mt-8 grid grid-cols-3 gap-x-2 gap-y-6 sm:mt-10 sm:gap-x-6 sm:gap-y-8 lg:mx-auto lg:max-w-[calc(75%+1.5rem)]">
          {topics.map((c) => (
            <li key={c.id}>
              <LearnEmblem category={c} />
            </li>
          ))}
        </ul>

        <Link
          href="/learn/builds"
          className="group mt-8 flex items-center justify-center gap-3 rounded border border-line bg-surface/50 px-4 py-3 text-sm text-muted transition-colors hover:border-gold/50 hover:text-fg sm:mt-10"
        >
          <ListOrdered size={16} className="text-gold" />
          <span>
            <span className="font-display text-[0.72rem] font-bold uppercase tracking-[0.12em] text-fg">Build orders</span>
            <span className="hidden sm:inline">, timed openings for every matchup, with a play-along clock</span>
          </span>
          <ArrowRight size={14} className="text-gold transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
