/** A country flag from its ISO 3166 alpha-2 code, as the regional-indicator
 *  emoji pair (renders as a flag on every current OS). Unknown codes render
 *  as the code itself. */
export function Flag({ code, className }: { code?: string; className?: string }) {
  if (!code) return null;
  // Subdivision codes like GB-SCT fall back to the country part.
  const cc = code.trim().toUpperCase().slice(0, 2);
  if (!/^[A-Z]{2}$/.test(cc)) return <span className={className}>{cc}</span>;
  const flag = String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return (
    <span className={className} title={cc} aria-label={cc}>
      {flag}
    </span>
  );
}
