import Link from "next/link";
import Image from "next/image";
import type { Guide, GuideLevel } from "@/lib/learn/data";
import { getCategory } from "@/lib/learn/data";
import { urlFor } from "@/sanity/image";

const LEVEL_LABEL: Record<GuideLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** Painted fallbacks for guides without a cover, rotated by card index. */
const FALLBACK_COVERS = [
  "/keyart/feature-night-elf.jpg",
  "/keyart/feature-undead-city.jpg",
  "/keyart/feature-orc-vs-human.jpg",
];

/** Feature-card treatment for a guide: framed cover, serif title, blurb,
 *  then category · level · reading time. */
export function GuideFeatureCard({
  guide,
  index = 0,
}: {
  guide: Guide;
  index?: number;
}) {
  const category = getCategory(guide.category);
  const cover = guide.coverImage
    ? urlFor(guide.coverImage).width(900).height(560).fit("crop").auto("format").url()
    : FALLBACK_COVERS[index % FALLBACK_COVERS.length];

  return (
    <article className="group flex flex-col items-center text-center">
      <Link href={`/learn/guide/${guide.slug}`} className="flex w-full flex-col items-center">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded border border-white/20 bg-surface-2 shadow-[0_14px_36px_-12px_rgba(0,0,0,.9)] transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:-translate-y-1 group-hover:border-gold/60">
          <Image
            src={cover}
            alt=""
            fill
            unoptimized={Boolean(guide.coverImage)}
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        <h3 className="mt-5 text-[1.05rem] font-bold leading-snug tracking-[0.06em] text-fg transition-colors group-hover:text-gold">
          {guide.title}
        </h3>
        <p className="mt-2.5 line-clamp-3 max-w-sm text-sm text-muted">
          {guide.excerpt}
        </p>
        <p className="kicker mt-4 text-[0.62rem]">
          {category?.title ?? "Guide"}
          <span className="text-faint">·</span>
          <span className="font-sans font-bold tracking-[0.1em] text-faint">
            {LEVEL_LABEL[guide.level]} · {guide.minutes} min
          </span>
        </p>
      </Link>
    </article>
  );
}
