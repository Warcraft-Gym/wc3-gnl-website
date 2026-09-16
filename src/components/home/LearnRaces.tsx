import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { LEARN_CATEGORIES, type LearnCategory } from "@/lib/learn/data";
import { ButtonLink } from "@/components/ui/Button";

/** Painted emblem for each topic hub; races use the Reforged crests. */
const TOPIC_ART: Record<string, string> = {
  "new-players": "/graphics/new-players-1.png",
  "creep-routes": "/graphics/creep-routes-1.png",
  mechanics: "/graphics/game-mechanics-1.png",
};

function artFor(c: LearnCategory): string | null {
  if (c.kind === "race" && c.race) return `/factions/large/${c.race}.png`;
  return TOPIC_ART[c.id] ?? null;
}

/** Emblem + title + blurb, linking to a Learn hub. */
function LearnEmblem({ category }: { category: LearnCategory }) {
  const art = artFor(category);
  return (
    <Link
      href={`/learn/${category.id}`}
      className="group flex flex-col items-center text-center"
    >
      <span className="relative block aspect-square w-full max-w-[11rem] transition-transform duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5">
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
      <span className="mt-4 font-display text-[0.8rem] font-bold uppercase leading-tight tracking-[0.14em] text-fg transition-colors group-hover:text-gold">
        {category.title}
      </span>
      <span className="mt-1 max-w-[11rem] text-xs text-muted">{category.blurb}</span>
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
        <h2 className="mt-3 text-[length:var(--wg-text-display)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
          Learn Warcraft III
        </h2>
        <p className="mt-5 max-w-md text-lg text-muted">
          Build orders, creep routes and game mechanics written by Gym coaches
          for players who want to get better — from your very first ladder
          game to preparing for a GNL season. Pick your race and start with the
          beginner guides.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href="/learn/new-players" size="md">
            Start learning <ArrowRight size={16} />
          </ButtonLink>
          <ButtonLink href="/learn" variant="outline" size="md">
            All guides
          </ButtonLink>
        </div>
      </div>

      <div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
          {races.map((c) => (
            <li key={c.id}>
              <LearnEmblem category={c} />
            </li>
          ))}
        </ul>

        <ul className="mt-10 grid grid-cols-2 justify-center gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:mx-auto lg:max-w-[calc(75%+1.5rem)]">
          {topics.map((c) => (
            <li key={c.id} className="last:col-span-2 sm:last:col-span-1">
              <LearnEmblem category={c} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
