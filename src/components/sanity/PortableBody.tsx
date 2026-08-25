import {
  PortableText,
  type PortableTextComponents,
} from "@portabletext/react";
import { urlFor } from "@/sanity/image";

/**
 * Renderer for Sanity Portable Text bodies (guides, posts). Handles images,
 * headings, lists, quotes, and links so migrated content renders faithfully.
 */
const components: PortableTextComponents = {
  types: {
    // Stray inline nodes the HTML converter can emit at block level — render
    // their text so no content is lost (and silence the console warning).
    span: ({ value }) => <>{(value as { text?: string })?.text ?? ""}</>,
    image: ({ value }) => {
      if (!value?.asset) return null;
      const src = urlFor(value).width(1400).fit("max").auto("format").url();
      const alt = value.alt || "";
      return (
        <figure className="my-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="h-auto w-full border border-line bg-surface"
          />
          {value.caption ? (
            <figcaption className="mt-2 text-center text-sm text-faint">
              {value.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    },
  },
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h1: ({ children }) => (
      <h2 className="mt-10 mb-3 font-display text-2xl font-bold uppercase text-fg">
        {children}
      </h2>
    ),
    h2: ({ children }) => (
      <h2 className="mt-10 mb-3 font-display text-2xl font-bold uppercase text-fg">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-2 font-display text-xl font-bold uppercase text-fg">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-6 mb-2 font-display text-lg font-bold uppercase text-fg">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-2 border-gold pl-5 text-lg italic text-fg">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-4 list-disc space-y-2 pl-6 marker:text-gold">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="my-4 list-decimal space-y-2 pl-6 marker:text-gold">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    link: ({ children, value }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noreferrer"
        className="text-arcane underline decoration-arcane/40 underline-offset-2 hover:decoration-arcane"
      >
        {children}
      </a>
    ),
  },
  // Don't drop content the converter emitted as an unexpected node type.
  unknownType: ({ value }) => {
    const text = (value as { text?: string })?.text;
    return text ? <p>{text}</p> : null;
  },
  unknownBlockStyle: ({ children }) => <p>{children}</p>,
};

export function PortableBody({ value }: { value: unknown[] }) {
  return (
    <div className="space-y-5 text-[1.075rem] leading-8 text-muted [&_strong]:text-fg">
      <PortableText value={value as never} components={components} />
    </div>
  );
}
