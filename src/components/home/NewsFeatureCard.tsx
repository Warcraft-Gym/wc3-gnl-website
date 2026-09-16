import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/content/types";

const CATEGORY_LABEL: Record<Post["category"], string> = {
  news: "News",
  recap: "Recap",
  guide: "Guide",
  announcement: "Announcement",
};

/** Painted fallbacks for posts without a cover, rotated by card index. */
const FALLBACK_COVERS = [
  "/keyart/feature-orc-vs-human.webp",
  "/keyart/feature-night-elf.webp",
  "/keyart/feature-undead-city.webp",
];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** "Game features" style card: framed image on top, centred serif title,
 *  short grey blurb. Sits directly on the painted section background. */
export function NewsFeatureCard({
  post,
  index = 0,
}: {
  post: Post;
  index?: number;
}) {
  const cover =
    post.coverImageUrl ?? FALLBACK_COVERS[index % FALLBACK_COVERS.length];
  return (
    <article className="group flex flex-col items-center text-center">
      <Link href={`/blog/${post.slug}`} className="flex w-full flex-col items-center">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded border border-white/20 bg-surface-2 shadow-[0_14px_36px_-12px_rgba(0,0,0,.9)] transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:-translate-y-1 group-hover:border-gold/60">
          <Image
            src={cover}
            alt=""
            fill
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        <h3 className="mt-5 text-[1.05rem] font-bold leading-snug tracking-[0.06em] text-fg transition-colors group-hover:text-gold">
          {post.title}
        </h3>
        <p className="mt-2.5 line-clamp-3 max-w-sm text-sm text-muted">
          {post.excerpt}
        </p>
        <p className="kicker mt-4 text-[0.62rem]">
          {CATEGORY_LABEL[post.category]}
          <span className="text-faint">·</span>
          <span className="font-sans font-bold tracking-[0.1em] text-faint">
            {formatDate(post.publishedAt)}
          </span>
        </p>
      </Link>
    </article>
  );
}
