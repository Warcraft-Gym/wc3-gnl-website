import Image from "next/image";
import { cn } from "@/lib/utils";

/** Full-bleed painted background for a `.keyart` section. Renders behind the
 *  section's content with an optional legibility overlay. Parent must be a
 *  `.keyart` section (relative + isolated) and the content it should sit
 *  behind must be `relative z-10`.
 *
 *  `decoding="sync"` is deliberate: with next/image's default async decode,
 *  Chrome finished decoding these large backgrounds after first paint and
 *  never repainted them, the art stayed invisible until something else
 *  invalidated the section (a scroll, a style change). Sync decode costs a
 *  few ms on the main thread but paints reliably. */
export function KeyArt({
  src,
  position = "center",
  priority = false,
  overlay = "soft",
  className,
}: {
  src: string;
  /** CSS object-position, e.g. "center top" or "80% center". */
  position?: string;
  priority?: boolean;
  /** How much to darken for text legibility. */
  overlay?: "none" | "soft" | "strong";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
    >
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        decoding="sync"
        className="object-cover"
        style={{ objectPosition: position }}
      />
      {overlay !== "none" ? (
        <div
          className={cn(
            "absolute inset-0",
            overlay === "soft"
              ? "bg-[linear-gradient(180deg,rgba(0,0,0,.55)_0%,rgba(0,0,0,.25)_35%,rgba(0,0,0,.35)_70%,rgba(0,0,0,.85)_100%)]"
              : "bg-[linear-gradient(180deg,rgba(0,0,0,.7)_0%,rgba(0,0,0,.6)_50%,rgba(0,0,0,.9)_100%)]",
          )}
        />
      ) : null}
    </div>
  );
}
