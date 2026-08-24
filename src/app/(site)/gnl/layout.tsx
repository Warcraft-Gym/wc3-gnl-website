import { GnlSubNav } from "@/components/layout/GnlSubNav";
import { getActiveSeason } from "@/lib/api/gnl";

export default async function GnlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const season = await getActiveSeason();
  return (
    <>
      <GnlSubNav seasonShortName={season.shortName} />
      {children}
    </>
  );
}
