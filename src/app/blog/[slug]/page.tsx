import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PostBody } from "@/components/blog/PostBody";
import { PostCard } from "@/components/blog/PostCard";
import { getPosts, getPostBySlug } from "@/lib/content";

const CATEGORY_LABEL = {
  news: "News",
  recap: "Recap",
  guide: "Guide",
  announcement: "Announcement",
} as const;

export async function generateStaticParams() {
  const { posts } = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const { posts } = await getPosts();
  const related = posts.filter((p) => p.slug !== slug).slice(0, 3);

  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(post.publishedAt));

  return (
    <article>
      <div className="relative overflow-hidden border-b border-line/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(34rem 20rem at 80% -20%, var(--wg-gold-glow), transparent 60%)",
          }}
        />
        <Container className="max-w-3xl py-14 sm:py-20">
          <Link
            href="/blog"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> Back to blog
          </Link>
          <div className="mb-4 flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.16em]">
            <span className="text-gold">{CATEGORY_LABEL[post.category]}</span>
            <span className="text-faint">·</span>
            <span className="text-faint">{date}</span>
          </div>
          <h1 className="text-[length:var(--wg-text-display)] font-extrabold">
            {post.title}
          </h1>
          <p className="mt-5 text-lg text-muted">{post.excerpt}</p>
          <p className="mt-6 text-sm text-faint">
            By {post.author} · {post.readingMinutes} min read
          </p>
        </Container>
      </div>

      {post.coverImageUrl ? (
        <Container className="max-w-4xl pt-10">
          <div className="relative aspect-[2/1] overflow-hidden rounded-lg border border-line">
            <Image
              src={post.coverImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 56rem"
              priority
            />
          </div>
        </Container>
      ) : null}

      <Container className="max-w-3xl py-12">
        <PostBody post={post} />
      </Container>

      {related.length ? (
        <Container className="max-w-5xl border-t border-line/60 py-14">
          <p className="kicker mb-6">Keep reading</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </Container>
      ) : null}
    </article>
  );
}
