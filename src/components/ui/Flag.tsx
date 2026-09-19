/** Subdivision flags that have their own emoji (the black-flag tag sequence). */
const SUBDIVISION_FLAGS = new Set(["GB-SCT", "GB-ENG", "GB-WLS"]);
const BLACK_FLAG = 0x1f3f4;
const TAG_BASE = 0xe0000;
const TAG_CANCEL = 0xe007f;

/** A country flag from its ISO 3166 alpha-2 code, as the regional-indicator
 *  emoji pair (renders as a flag on every current OS). Scotland, England and
 *  Wales get their own flags from their GB subdivision codes; any other
 *  subdivision falls back to the country. Unknown codes render as the code. */
export function Flag({ code, className }: { code?: string; className?: string }) {
  if (!code) return null;
  const full = code.trim().toUpperCase();
  if (SUBDIVISION_FLAGS.has(full)) {
    const tags = [...full.replace("-", "").toLowerCase()].map((c) => TAG_BASE + c.charCodeAt(0));
    const flag = String.fromCodePoint(BLACK_FLAG, ...tags, TAG_CANCEL);
    return (
      <span className={className} title={full} aria-label={full}>
        {flag}
      </span>
    );
  }
  const cc = full.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(cc)) return <span className={className}>{cc}</span>;
  const flag = String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return (
    <span className={className} title={cc} aria-label={cc}>
      {flag}
    </span>
  );
}
