import { ImageResponse } from "next/og";
import { getBuildBySlug } from "@/lib/builds/builds";
import { BUILD_DIFFICULTIES, vsLabel } from "@/lib/builds/types";
import { OgCard, OG_CONTENT_TYPE, OG_RACE_COLOUR, OG_SIZE, ogFonts } from "@/lib/og";
import { RACES } from "@/lib/utils";

export const alt = "A Warcraft III build order";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const build = await getBuildBySlug(slug);
  const difficulty = BUILD_DIFFICULTIES.find((d) => d.id === build?.difficulty)?.label;

  return new ImageResponse(
    (
      <OgCard
        kicker="Build order"
        title={build?.title ?? "Build order"}
        subtitle={build ? `${RACES[build.race].label} vs ${vsLabel(build.vsRaces)}` : undefined}
        accent={build ? OG_RACE_COLOUR[build.race] : undefined}
        facts={[
          ...(build ? [{ label: "Steps", value: String(build.steps.length), tone: "gold" as const }] : []),
          ...(difficulty ? [{ label: "Difficulty", value: difficulty }] : []),
          ...(build?.author ? [{ label: "By", value: build.author }] : []),
        ]}
      />
    ),
    { ...size, fonts: await ogFonts() },
  );
}
