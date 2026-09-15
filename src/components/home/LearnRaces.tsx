import Link from "next/link";
import { ArrowRight, Cog, Map, Sparkles } from "lucide-react";
import { LEARN_CATEGORIES } from "@/lib/learn/data";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { ButtonLink } from "@/components/ui/Button";

const TOPIC_ICON = {
  "new-players": Sparkles,
  "creep-routes": Map,
  mechanics: Cog,
} as const;

/** "Races" section, Learn edition: one medallion per race linking to that
 *  race's guides, plus the topic hubs underneath. */
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
        <ul className="flex flex-wrap gap-x-6 gap-y-7 sm:gap-x-8">
          {races.map((c) => (
            <li key={c.id} className="w-24 sm:w-28">
              <Link
                href={`/learn/${c.id}`}
                className="group flex flex-col items-center text-center"
              >
                <span className="grid size-24 place-items-center rounded-full border-2 border-gold-deep/70 bg-surface/80 p-1 shadow-[0_0_0_4px_rgba(0,0,0,.6),0_12px_30px_-10px_rgba(0,0,0,.9)] transition-[border-color,box-shadow,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:-translate-y-1 group-hover:border-gold group-hover:shadow-[0_0_0_4px_rgba(0,0,0,.6),0_0_34px_-6px_var(--wg-gold-glow)] sm:size-28">
                  <span className="grid size-full place-items-center rounded-full border border-line-strong bg-surface-2">
                    {c.race ? <RaceIcon race={c.race} size={56} /> : null}
                  </span>
                </span>
                <span className="mt-3 font-display text-[0.72rem] font-bold uppercase leading-tight tracking-[0.12em] text-fg transition-colors group-hover:text-gold">
                  {c.title}
                </span>
                <span className="mt-1 text-xs text-muted">{c.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>

        <ul className="mt-9 flex flex-wrap gap-2">
          {topics.map((c) => {
            const Icon = TOPIC_ICON[c.id as keyof typeof TOPIC_ICON] ?? Sparkles;
            return (
              <li key={c.id}>
                <Link
                  href={`/learn/${c.id}`}
                  className="inline-flex items-center gap-2 rounded border border-line bg-surface/50 px-4 py-2 font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted transition-colors hover:border-gold/60 hover:text-gold"
                >
                  <Icon size={14} className="text-gold" /> {c.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
