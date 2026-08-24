import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { BracketView } from "@/components/league/BracketView";
import { DataSourceNote } from "@/components/DataSourceNote";
import { getActiveSeason, getBracket } from "@/lib/api/gnl";

export const metadata: Metadata = {
  title: "Playoffs",
  description: "The GNL playoff bracket — single elimination to the Grand Final.",
};

export default async function BracketsPage() {
  const [season, { bracket, source }] = await Promise.all([
    getActiveSeason(),
    getBracket(),
  ]);

  return (
    <>
      <PageHeader
        kicker={`${season.shortName} · Playoffs`}
        title={bracket.name}
        lead="Single elimination. Top four seeds earn a home series. Win three, lift the trophy."
      />
      <Container className="py-10">
        <DataSourceNote source={source} />
        <BracketView bracket={bracket} />
      </Container>
    </>
  );
}
