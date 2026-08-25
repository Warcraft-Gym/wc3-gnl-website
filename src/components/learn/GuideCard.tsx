import Link from "next/link";
import type { Guide, GuideLevel } from "@/lib/learn/data";
import { getCategory } from "@/lib/learn/data";
import { Surface } from "@/components/ui/Surface";
import { urlFor } from "@/sanity/image";
import { cn } from "@/lib/utils";

const LEVEL_TONE: Record<GuideLevel, string> = {
  beginner: "border-win/50 text-win",
  intermediate: "border-arcane/50 text-arcane",
  advanced: "border-gold/50 text-gold",
};

export function GuideCard({ guide }: { guide: Guide }) {
  const category = getCategory(guide.category);
  const cover = guide.coverImage
    ? urlFor(guide.coverImage).width(700).height(394).fit("crop").auto("format").url()
    : null;

  return (
    <Surface interactive as="article" className="group flex flex-col overflow-hidden">
      <Link href={`/learn/guide/${guide.slug}`} className="flex flex-1 flex-col">
        {/* Preview image */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-105"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(18rem 10rem at 30% 20%, var(--wg-gold-glow), transparent 60%), linear-gradient(160deg, var(--wg-surface-3), var(--wg-surface))",
              }}
            />
          )}
          <span
            className={cn(
              "absolute left-3 top-3 border bg-bg-deep/80 px-1.5 py-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] backdrop-blur-sm",
              LEVEL_TONE[guide.level],
            )}
          >
            {guide.level}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-5">
          {category ? (
            <p className="mb-2 font-mono text-[0.64rem] font-bold uppercase tracking-[0.16em] text-faint">
              {category.title}
            </p>
          ) : null}
          <h3 className="font-display text-lg font-bold uppercase leading-tight text-fg transition-colors group-hover:text-gold">
            {guide.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm text-muted">{guide.excerpt}</p>
          <div className="mt-auto pt-4 text-xs text-faint">
            {guide.minutes} min read
          </div>
        </div>
      </Link>
    </Surface>
  );
}
