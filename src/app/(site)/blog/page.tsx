import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PostCard } from "@/components/blog/PostCard";
import { getPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "News",
  description: "News, season recaps, replay of the month and announcements from the Warcraft 3 Gym community.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const { posts } = await getPosts();
  const [featured, ...rest] = posts;

  return (
    <>
      <PageHeader
        kicker="From the desk"
        title="Latest News"
        lead="Recaps, roster news, strategy guides, and everything happening across the league."
      />
      <Container className="py-12">
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

        {!posts.length ? (
          <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            No posts yet.
          </p>
        ) : null}
      </Container>
    </>
  );
}
