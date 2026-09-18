import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { LearnCategory } from "@/lib/learn/data";
import { learnArt } from "@/lib/learn/art";
import { Surface } from "@/components/ui/Surface";

/** Category card with the same crest / emblem as the homepage. `href` and
 *  `art` override the category's own, for the build orders card. */
export function CategoryCard({
  category,
  href,
  art: artOverride,
}: {
  category: LearnCategory;
  href?: string;
  art?: string;
}) {
  const art = artOverride ?? learnArt(category);

  return (
    <Surface interactive as="article" className="group">
      <Link
        href={href ?? `/learn/${category.id}`}
        className="flex h-full items-center gap-4 p-5"
      >
        <span className="relative block size-20 shrink-0 transition-transform duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:scale-105">
          <span
            aria-hidden
            className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-40 blur-lg transition-opacity duration-[var(--wg-dur)] group-hover:opacity-90"
          />
          {art ? (
            <Image
              src={art}
              alt=""
              fill
              sizes="80px"
              className="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,.8)]"
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
