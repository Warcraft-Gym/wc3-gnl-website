import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { PostCard } from "@/components/blog/PostCard";
import { getPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog",
  description: "News, recaps, guides and announcements from the Warcraft 3 Gym.",
};

export default async function BlogPage() {
  const { posts } = await getPosts();
  const [featured, ...rest] = posts;

  return (
    <>
      <PageHeader
        kicker="From the desk"
        title="The Gym Blog"
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
      </Container>
    </>
  );
}
