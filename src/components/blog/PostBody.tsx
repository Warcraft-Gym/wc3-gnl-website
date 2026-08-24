import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { Post } from "@/lib/content/types";

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => (
      <h2 className="mt-10 mb-3 font-display text-2xl font-bold text-fg">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-2 font-display text-xl font-bold text-fg">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-2 border-gold pl-5 text-lg italic text-fg">
        {children}
      </blockquote>
    ),
  },
  marks: {
    link: ({ children, value }) => (
      <a
        href={value?.href}
        className="text-arcane underline decoration-arcane/40 underline-offset-2 hover:decoration-arcane"
        target="_blank"
        rel="noreferrer"
      >
        {children}
      </a>
    ),
  },
};

/** Renders Sanity Portable Text when present, else fixture paragraphs. */
export function PostBody({ post }: { post: Post }) {
  return (
    <div className="space-y-5 text-[1.075rem] leading-8 text-muted [&_strong]:text-fg">
      {post.portableText ? (
        <PortableText value={post.portableText as never} components={components} />
      ) : (
        post.paragraphs?.map((p, i) => <p key={i}>{p}</p>)
      )}
    </div>
  );
}
