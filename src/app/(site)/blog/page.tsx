import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PostCard } from "@/components/blog/PostCard";
import { getPosts } from "@/lib/content";
import type { PostCategory } from "@/lib/content/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Latest News",
  description: "News, recaps, guides and announcements from the Warcraft 3 Gym.",
};

const LABELS: Record<PostCategory, string> = {
  news: "News",
  recap: "Recap",
  guide: "Guide",
  announcement: "Announcement",
};
const ORDER: PostCategory[] = ["news", "recap", "guide", "announcement"];

function FilterTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "skew border px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wider transition-colors",
        active
          ? "border-gold bg-gold text-bg-deep"
          : "border-line text-muted hover:border-gold/60 hover:text-gold",
      )}
    >
      <span className="inline-block [transform:skewX(calc(var(--wg-skew)*-1))]">
        {label}
      </span>
    </Link>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const raw = (await searchParams).category;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const { posts } = await getPosts();

  // Only offer tabs for categories that actually have posts.
  const present = ORDER.filter((c) => posts.some((p) => p.category === c));
  const active = present.includes(requested as PostCategory)
    ? (requested as PostCategory)
    : null;

  const filtered = active ? posts.filter((p) => p.category === active) : posts;
  const [featured, ...rest] = filtered;

  return (
    <>
      <PageHeader
        kicker="From the desk"
        title="Latest News"
        lead="Recaps, roster news, strategy guides, and everything happening across the league."
      />
      <Container className="py-12">
        {present.length > 1 ? (
          <div className="mb-8 flex flex-wrap gap-2">
            <FilterTab href="/blog" label="All" active={!active} />
            {present.map((c) => (
              <FilterTab
                key={c}
                href={`/blog?category=${c}`}
                label={LABELS[c]}
                active={active === c}
              />
            ))}
          </div>
        ) : null}

        {featured ? (
          <div className="mb-6">
            <PostCard post={featured} featured />
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>

        {!filtered.length ? (
          <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            No posts in this category yet.
          </p>
        ) : null}
      </Container>
    </>
  );
}
