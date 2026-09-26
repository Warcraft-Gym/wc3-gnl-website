import { ImageResponse } from "next/og";
import { getPlayerProfile } from "@/lib/api/gnl";
import { parsePlayerParam } from "@/lib/slug.mjs";
import { record } from "@/lib/figures.mjs";
import { OgCard, OG_CONTENT_TYPE, OG_RACE_COLOUR, OG_SIZE, ogFonts } from "@/lib/og";
import { RACES } from "@/lib/utils";

export const alt = "A Gym Newbie League player";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { id } = parsePlayerParam(slug);
  const profile = id != null ? await getPlayerProfile(id) : undefined;
  const player = profile?.player;
  const seasons = profile?.history.filter((h) => h.record.seriesPlayed > 0 || h.series.length) ?? [];
  const series = profile ? record(profile.allTime.seriesWon, profile.allTime.seriesLost) : null;
  const mmr = profile?.w3c[0];

  return new ImageResponse(
    (
      <OgCard
        kicker={profile ? `${profile.latestSeason.shortName} ${profile.captainOnly ? "captain" : "player"}` : "GNL player"}
        title={player?.name ?? "Player"}
        subtitle={[player?.race ? RACES[player.race].label : null, profile?.team?.name].filter(Boolean).join(" · ") || undefined}
        accent={player?.race ? OG_RACE_COLOUR[player.race] : undefined}
        facts={[
          ...(series ? [{ label: "GNL series", value: series, tone: "gold" as const }] : []),
          ...(seasons.length ? [{ label: "Seasons", value: String(seasons.length) }] : []),
          ...(mmr ? [{ label: `W3C MMR · ${RACES[mmr.race].label}`, value: String(mmr.mmr) }] : []),
        ]}
      />
    ),
    { ...size, fonts: await ogFonts() },
  );
}
