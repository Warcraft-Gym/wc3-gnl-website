/**
 * Numbered section heading — a small gold number badge plus the section's
 * name, exactly `BuildSubmitForm`'s own `SectionTitle` (`/learn/builds/submit`),
 * so the two editors read as one family instead of one feeling less
 * finished than the other (F009, the ux.md review's item 3).
 */
export function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[1.05rem] font-bold tracking-[0.06em]">
      <span className="btn-gold grid size-7 shrink-0 place-items-center rounded font-display text-xs font-bold">{n}</span>
      {children}
    </h2>
  );
}
