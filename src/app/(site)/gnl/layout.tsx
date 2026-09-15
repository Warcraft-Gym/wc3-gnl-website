import { GnlSubNav } from "@/components/layout/GnlSubNav";
import { getActiveSeason } from "@/lib/api/gnl";

export default async function GnlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const season = await getActiveSeason();
  // Header + sub-nav together form the chrome that page mastheads sit under.
  return (
    <div className="[--wg-chrome-h:calc(var(--wg-header-h)+var(--wg-subnav-h))]">
      <GnlSubNav seasonShortName={season.shortName} />
      {children}
    </div>
  );
}
