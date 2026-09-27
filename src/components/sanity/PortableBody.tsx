import {
  PortableText,
  type PortableTextComponents,
} from "@portabletext/react";
import { urlFor } from "@/sanity/image";
// Shared with the creep route Video field so both understand the same URLs.
import { embedUrl } from "@/lib/video-embed.mjs";
import { displayWidth, imageDimensions, isIconSized } from "@/lib/sanity-image-size.mjs";
import { groupIconLabelPairs } from "@/lib/icon-grid.mjs";
import { ZoomableImage } from "@/components/ui/ZoomableImage";


/**
 * Renderer for Sanity Portable Text bodies (guides, posts). Handles images,
 * headings, lists, quotes, and links so migrated content renders faithfully.
 */
const components: PortableTextComponents = {
  types: {
    // Stray inline nodes the HTML converter can emit at block level, render
    // their text so no content is lost (and silence the console warning).
    span: ({ value }) => <>{(value as { text?: string })?.text ?? ""}</>,
    youtube: ({ value }) => {
      const url = (value as { url?: string })?.url;
      const embed = embedUrl(url);
      if (!embed) {
        return url ? (
          <p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-arcane underline decoration-arcane/40 underline-offset-2 hover:decoration-arcane"
            >
              Watch the video
            </a>
          </p>
        ) : null;
      }
      return (
        <figure className="my-7 aspect-video overflow-hidden border border-line bg-bg-deep">
          <iframe
            src={embed}
            title="Video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </figure>
      );
    },
    iconGrid: ({ value }) => {
      const items = (value as { items?: { _key: string; image: { alt?: string }; label: string }[] })?.items ?? [];
      if (!items.length) return null;
      return (
        <ul className="my-5 grid list-none grid-cols-2 gap-x-4 gap-y-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const d = imageDimensions(item.image);
            return (
              <li key={item._key} className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlFor(item.image).width(d?.width ?? 64).fit("max").auto("format").url()}
                  alt={item.image.alt || ""}
                  loading="lazy"
                  width={d?.width}
                  height={d?.height}
                  className="size-10 shrink-0 rounded border border-line bg-surface object-contain"
                />
                <span className="min-w-0 text-[0.95rem] leading-snug text-fg">{item.label}</span>
              </li>
            );
          })}
        </ul>
      );
    },
    image: ({ value }) => {
      if (!value?.asset) return null;
      const alt = value.alt || "";

      // Draw an image at its own size, never larger. Every picture used to be
      // `w-full` and requested at 1400px, which is right for a screenshot and
      // wrong for a 64-pixel item icon — the guide on item drops has 64 of
      // them, each upscaled to the width of the column. Sanity puts the real
      // dimensions in the asset id, so the renderer can tell the two apart.
      const dimensions = imageDimensions(value);
      // The author's "Display size" choice wins; without one, the image's own
      // size decides. See `sanity-image-size.mjs`.
      const width = displayWidth(value, 1400);
      const isIcon = isIconSized(value, 1400);
      const src = urlFor(value).width(width).fit("max").auto("format").url();

      // Zoomable only when there is more to see than the page already shows:
      // an icon drawn at its own 64px has no hidden detail, and opening it
      // full-screen would just show a blur.
      const zoomSrc = isIcon ? undefined : urlFor(value).width(2000).fit("max").auto("format").url();

      return (
        <>
          <ZoomableImage
            src={src}
            zoomSrc={zoomSrc}
            alt={alt}
            width={width}
            height={dimensions ? Math.round((dimensions.height / dimensions.width) * width) : undefined}
            figureClassName={isIcon ? "my-4" : "my-7"}
            // `max-w-full` keeps a wide image inside the column on a phone;
            // the width attribute stops a small one from stretching to fill
            // it. An icon keeps its border tight rather than framing a blur.
            className={
              isIcon
                ? "h-auto max-w-full rounded border border-line bg-surface"
                : "h-auto w-full border border-line bg-surface"
            }
          />
          {value.caption ? (
            <p className="-mt-4 mb-7 text-center text-sm text-faint">{value.caption}</p>
          ) : null}
        </>
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
  // Migrated catalogue articles arrive as an alternating run of icon and
  // name; grouped here so the renderer can lay them out as a table rather
  // than sixty rows of one picture and three words. See `icon-grid.mjs`.
  const blocks = groupIconLabelPairs(value as never[]);
  return (
    <div className="space-y-5 text-[1.075rem] leading-8 text-muted [&_strong]:text-fg">
      <PortableText value={blocks as never} components={components} />
    </div>
  );
}
