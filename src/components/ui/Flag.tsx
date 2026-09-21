/* eslint-disable @next/next/no-img-element -- tiny static SVGs, no optimisation needed */

/** Country codes that have a flag file in public/flags (flag-icons, MIT).
 *  ISO 3166-1 alpha-2 plus the GB nations. */
const SUBDIVISIONS = new Set(["GB-SCT", "GB-ENG", "GB-WLS", "GB-NIR"]);

/** A country flag from its ISO 3166 alpha-2 code, as a small SVG image.
 *  Images rather than emoji because Windows has no flag emoji at all.
 *  Scotland, England, Wales and Northern Ireland get their own flags from
 *  their GB subdivision codes; any other subdivision falls back to the
 *  country. Unknown codes render as the code itself. */
export function Flag({ code, className, size = 16 }: { code?: string; className?: string; size?: number }) {
  if (!code) return null;
  const full = code.trim().toUpperCase();
  const key = SUBDIVISIONS.has(full) ? full : full.slice(0, 2);
  if (!/^[A-Z]{2}(-[A-Z]{3})?$/.test(key)) return <span className={className}>{full}</span>;
  return (
    <img
      src={`/flags/${key.toLowerCase()}.svg`}
      alt={key}
      title={key}
      width={size}
      height={Math.round((size * 3) / 4)}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ display: "inline-block", verticalAlign: "-0.125em", borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,.35)" }}
    />
  );
}
