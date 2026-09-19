import { GnlSubNav } from "@/components/layout/GnlSubNav";
import { getSeasons } from "@/lib/api/gnl";

export default async function GnlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const seasons = await getSeasons();
  // Header + sub-nav together form the chrome that page mastheads sit under.
  return (
    <div className="[--wg-chrome-h:calc(var(--wg-header-h)+var(--wg-subnav-h))]">
      <GnlSubNav seasons={seasons.map((s) => ({ number: s.number, shortName: s.shortName, name: s.name }))} />
      {children}
    </div>
  );
}
