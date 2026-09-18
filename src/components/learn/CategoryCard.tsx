import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { LearnCategory } from "@/lib/learn/data";
import { learnArt } from "@/lib/learn/art";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

/** Category card with the same crest / emblem as the homepage. `href` and
 *  `art` override the category's own, for the build orders card. `stacked`
 *  puts the emblem above the text, for narrow four-up rows. */
export function CategoryCard({
  category,
  href,
  art: artOverride,
  stacked = false,
}: {
  category: LearnCategory;
  href?: string;
  art?: string;
  stacked?: boolean;
}) {
  const art = artOverride ?? learnArt(category);

  return (
    <Surface interactive as="article" className="group">
      <Link
        href={href ?? `/learn/${category.id}`}
        className={cn("flex h-full gap-4 p-5", stacked ? "flex-col items-center text-center" : "items-center")}
      >
        <span className={cn("relative block shrink-0 transition-transform duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:scale-105", stacked ? "size-24" : "size-20")}>
          <span
            aria-hidden
            className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-40 blur-lg transition-opacity duration-[var(--wg-dur)] group-hover:opacity-90"
          />
          {art ? (
            <Image
              src={art}
              alt=""
              fill
              sizes="96px"
              className="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,.8)]"
            />
          ) : null}
        </span>
        <div className={cn("min-w-0 flex-1", stacked && "w-full")}>
          <div className={cn("flex items-center gap-2", stacked ? "justify-center" : "justify-between")}>
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
