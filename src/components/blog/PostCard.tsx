import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/content/types";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<Post["category"], string> = {
  news: "News",
  recap: "Recap",
  guide: "Guide",
  announcement: "Announcement",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function PostCard({
  post,
  featured = false,
}: {
  post: Post;
  featured?: boolean;
}) {
  return (
    <Surface
      interactive
      as="article"
      className={cn(
        "group flex flex-col overflow-hidden",
        featured && "md:flex-row",
      )}
    >
      <Link
        href={`/blog/${post.slug}`}
        className={cn("flex flex-1 flex-col", featured && "md:flex-row")}
      >
        <div
          className={cn(
            "relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-surface-2",
            featured && "md:aspect-auto md:w-1/2",
          )}
        >
          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(20rem 12rem at 30% 20%, var(--wg-gold-glow), transparent 60%), linear-gradient(160deg, var(--wg-surface-3), var(--wg-surface))",
              }}
            />
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.16em]">
            <span className="text-gold">{CATEGORY_LABEL[post.category]}</span>
            <span className="text-faint">·</span>
            <span className="text-faint">{formatDate(post.publishedAt)}</span>
          </div>
          <h3
            className={cn(
              "font-display font-bold leading-tight text-fg transition-colors group-hover:text-gold",
              featured ? "text-2xl" : "text-lg",
            )}
          >
            {post.title}
          </h3>
          <p className="mt-2.5 line-clamp-3 text-sm text-muted">
            {post.excerpt}
          </p>
          <div className="mt-auto pt-4 text-xs text-faint">
            {post.author} · {post.readingMinutes} min read
          </div>
        </div>
      </Link>
    </Surface>
  );
}
