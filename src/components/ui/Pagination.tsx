import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Windowed page list: 1 … 4 5 6 … 20 */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);

  const arrow =
    "skew grid h-9 w-9 place-items-center border transition-colors";
  const enabled = "border-line text-muted hover:border-gold/60 hover:text-gold";
  const disabled = "border-line/50 text-faint pointer-events-none opacity-50";

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      <Link
        href={href(currentPage - 1)}
        aria-label="Previous page"
        aria-disabled={currentPage <= 1}
        className={cn(arrow, currentPage <= 1 ? disabled : enabled)}
      >
        <ChevronLeft size={16} className="[transform:skewX(calc(var(--wg-skew)*-1))]" />
      </Link>

      {pageWindow(currentPage, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 font-mono text-sm text-faint">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={cn(
              "skew grid h-9 min-w-9 place-items-center border px-2 font-display text-sm font-extrabold transition-colors",
              p === currentPage
                ? "border-gold bg-gold text-bg-deep"
                : "border-line text-muted hover:border-gold/60 hover:text-gold",
            )}
          >
            <span className="tnum [transform:skewX(calc(var(--wg-skew)*-1))]">{p}</span>
          </Link>
        ),
      )}

      <Link
        href={href(currentPage + 1)}
        aria-label="Next page"
        aria-disabled={currentPage >= totalPages}
        className={cn(arrow, currentPage >= totalPages ? disabled : enabled)}
      >
        <ChevronRight size={16} className="[transform:skewX(calc(var(--wg-skew)*-1))]" />
      </Link>
    </nav>
  );
}
