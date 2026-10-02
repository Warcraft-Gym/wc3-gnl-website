"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { StopImage } from "@/lib/creep-routes/types";

/** A Sanity image url takes resize parameters; a fixture's plain url is served as is. */
function sized(url: string, params: string) {
  return url.startsWith("https://cdn.sanity.io/") ? `${url}?${params}` : url;
}

/**
 * A stop's pictures: a strip of 4:3 thumbnails (two side by side, about 200px tall), each a
 * button named by its alt. A click opens a native `<dialog>` lightbox with the full picture
 * (at most 92vw by 88vh), its caption, and previous / next when there is more than one;
 * Escape or a click on the backdrop closes it and focus returns to the thumbnail.
 */
export function StopImages({ images }: { images: StopImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const opener = useRef<number | null>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (index !== null && !el.open) el.showModal();
    if (index === null && el.open) el.close();
  }, [index]);

  const open = (i: number) => {
    opener.current = i;
    setIndex(i);
  };
  const step = (by: number) => setIndex((i) => (i === null ? i : (i + by + images.length) % images.length));
  const shown = index === null ? null : images[index];

  return (
    <>
      <ul className="grid max-w-[34rem] grid-cols-2 gap-2">
        {images.map((img, i) => (
          <li key={img.url}>
            <button
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              type="button"
              aria-label={img.alt}
              onClick={() => open(i)}
              className="block w-full overflow-hidden rounded border border-line-strong bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a sized thumb, Sanity's CDN or a fixture file. */}
              <img src={sized(img.url, "w=640&h=480&fit=crop&auto=format")} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        aria-label={shown?.alt ?? "Picture"}
        onClose={() => {
          setIndex(null);
          if (opener.current !== null) thumbs.current[opener.current]?.focus();
        }}
        // A click on the backdrop lands on the dialog itself, not on its content.
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        className="m-auto max-h-none max-w-none bg-transparent p-0 text-fg backdrop:bg-black/80"
      >
        {shown ? (
          <figure className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- the full picture in the lightbox. */}
            <img src={sized(shown.url, "w=1600&auto=format")} alt={shown.alt} className="max-h-[88vh] max-w-[92vw] rounded object-contain" />
            <figcaption className="flex w-full max-w-[92vw] items-center gap-3 text-sm text-muted">
              {images.length > 1 ? (
                <button type="button" onClick={() => step(-1)} aria-label="Previous picture" className="grid size-8 place-items-center rounded border border-line text-fg hover:text-gold">
                  <ChevronLeft size={16} />
                </button>
              ) : null}
              <span className="min-w-0 flex-1 text-center">{shown.caption ?? ""}</span>
              {images.length > 1 ? (
                <button type="button" onClick={() => step(1)} aria-label="Next picture" className="grid size-8 place-items-center rounded border border-line text-fg hover:text-gold">
                  <ChevronRight size={16} />
                </button>
              ) : null}
              <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="grid size-8 place-items-center rounded border border-line text-fg hover:text-gold">
                <X size={16} />
              </button>
            </figcaption>
          </figure>
        ) : null}
      </dialog>
    </>
  );
}
