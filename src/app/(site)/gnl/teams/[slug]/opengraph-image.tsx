import { ImageResponse } from "next/og";
import { getTeamPage } from "@/lib/api/gnl";
import { record } from "@/lib/figures.mjs";
import { parseSeasonParam } from "@/lib/api/season-params";
import { OgCard, OG_CONTENT_TYPE, OG_SIZE, ogFonts } from "@/lib/og";

export const alt = "A Gym Newbie League team";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** A share card names one season: the newest the team played, since the
 *  canonical team URL carries no season. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getTeamPage(slug, parseSeasonParam(undefined));
  const fixtures = data?.standing ? record(data.standing.wins, data.standing.losses, data.standing.draws) : null;

  return new ImageResponse(
    (
      <OgCard
        kicker={data ? `${data.season.shortName} team` : "GNL team"}
        title={data?.team.name ?? "Team"}
        subtitle={
          data?.team.captains.length
            ? `Captain${data.team.captains.length > 1 ? "s" : ""} ${data.team.captains.map((c) => c.name).join(" and ")}`
            : undefined
        }
        facts={[
          ...(data?.standing ? [{ label: "Standing", value: `#${data.standing.rank}`, tone: "gold" as const }] : []),
          ...(fixtures ? [{ label: "Fixtures", value: fixtures }] : []),
          ...(data?.standing ? [{ label: "Points", value: String(data.standing.points) }] : []),
        ]}
      />
    ),
    { ...size, fonts: await ogFonts() },
  );
}
