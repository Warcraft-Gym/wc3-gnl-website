"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * An image that opens full-size in a modal when clicked.
 *
 * Only worth offering when there is more to see: a 64-pixel item icon has no
 * hidden detail, and opening it full-screen shows a blur. The caller passes
 * `zoomSrc` only for images whose source is larger than the space they are
 * drawn in; without it this renders a plain `<img>` and costs nothing.
 *
 * The modal is a real dialog: Escape closes it, so does the backdrop and the
 * button; focus moves in and returns to the image that opened it; the page
 * behind does not scroll.
 */
export function ZoomableImage({
  src,
  zoomSrc,
  alt,
  width,
  height,
  className,
  figureClassName,
}: {
  src: string;
  /** Larger rendition. Omit to make the image non-zoomable. */
  zoomSrc?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  figureClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // Keep the page still behind the overlay.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closer.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  /* eslint-disable-next-line @next/next/no-img-element */
  const img = <img src={src} alt={alt} width={width} height={height} loading="lazy" className={className} />;

  if (!zoomSrc) return <figure className={figureClassName}>{img}</figure>;

  return (
    <figure className={figureClassName}>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        // The image already carries the description; the button says what
        // pressing it does.
        aria-label={alt ? `View larger: ${alt}` : "View larger"}
        className="block w-full cursor-zoom-in rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {img}
      </button>

      {/* No "mounted" guard: the portal only exists once `open` is true, and
          that can only come from a click, which is always client-side. */}
      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={alt || "Image"}
              onClick={close}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
            >
              <button
                ref={closer}
                type="button"
                onClick={close}
                aria-label="Close image"
                className="absolute right-3 top-3 grid size-11 place-items-center rounded border border-line bg-surface/80 text-muted hover:border-gold/50 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <X size={20} />
              </button>
              {/* Stop a click on the picture itself from closing: people
                  click the image to look at it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomSrc}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                className={cn("max-h-full max-w-full cursor-zoom-out rounded object-contain shadow-2xl")}
              />
            </div>,
            document.body,
          )
        : null}
    </figure>
  );
}
