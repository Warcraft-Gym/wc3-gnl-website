import Link from "next/link";
import type { Guide, GuideLevel } from "@/lib/learn/data";
import { getCategory } from "@/lib/learn/data";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

const LEVEL_TONE: Record<GuideLevel, string> = {
  beginner: "border-win/50 text-win",
  intermediate: "border-arcane/50 text-arcane",
  advanced: "border-gold/50 text-gold",
};

export function GuideCard({ guide }: { guide: Guide }) {
  const category = getCategory(guide.category);
  return (
    <Surface interactive as="article" className="group flex flex-col">
      <Link href={`/learn/guide/${guide.slug}`} className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-2 font-mono text-[0.64rem] font-bold uppercase tracking-[0.16em]">
          <span
            className={cn(
              "border px-1.5 py-0.5",
              LEVEL_TONE[guide.level],
            )}
          >
            {guide.level}
          </span>
          {category ? (
            <span className="text-faint">{category.title}</span>
          ) : null}
        </div>
        <h3 className="font-display text-lg font-bold uppercase leading-tight text-fg transition-colors group-hover:text-gold">
          {guide.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted">{guide.excerpt}</p>
        <div className="mt-auto pt-4 text-xs text-faint">
          {guide.minutes} min read
        </div>
      </Link>
    </Surface>
  );
}
