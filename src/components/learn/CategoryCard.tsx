import Link from "next/link";
import { ArrowUpRight, Map, Cog, Sparkles } from "lucide-react";
import type { LearnCategory } from "@/lib/learn/data";
import { Surface } from "@/components/ui/Surface";
import { RaceIcon } from "@/components/ui/RaceIcon";

const TOPIC_ICON = {
  "new-players": Sparkles,
  "creep-routes": Map,
  mechanics: Cog,
} as const;

export function CategoryCard({ category }: { category: LearnCategory }) {
  const TopicIcon =
    category.kind === "topic"
      ? TOPIC_ICON[category.id as keyof typeof TOPIC_ICON] ?? Sparkles
      : null;

  return (
    <Surface interactive as="article" className="group">
      <Link
        href={`/learn/${category.id}`}
        className="flex h-full items-start gap-4 p-5"
      >
        <span className="skew grid size-12 shrink-0 place-items-center bg-gold/10 text-gold">
          {category.kind === "race" && category.race ? (
            <RaceIcon race={category.race} size={26} />
          ) : TopicIcon ? (
            <TopicIcon
              size={22}
              className="[transform:skewX(calc(var(--wg-skew)*-1))]"
            />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold uppercase text-fg transition-colors group-hover:text-gold">
              {category.title}
            </h3>
            <ArrowUpRight
              size={18}
              className="shrink-0 text-faint transition-colors group-hover:text-gold"
            />
          </div>
          <p className="mt-1 text-sm text-muted">{category.blurb}</p>
        </div>
      </Link>
    </Surface>
  );
}
