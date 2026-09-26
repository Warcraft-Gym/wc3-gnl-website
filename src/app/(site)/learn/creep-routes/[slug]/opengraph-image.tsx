import { ImageResponse } from "next/og";
import { getCreepRouteBySlug } from "@/lib/creep-routes/routes";
import { ROUTE_LEVELS } from "@/lib/creep-routes/types";
import { vsLabel } from "@/lib/builds/types";
import { OgCard, OG_CONTENT_TYPE, OG_RACE_COLOUR, OG_SIZE, ogFonts } from "@/lib/og";
import { RACES } from "@/lib/utils";

/** The share card for a creep route, drawn the same way a build order's is.
 *
 * Routes previously pointed `openGraph.images` at the static race header
 * (`/factions/headers/orc.webp`), so every Orc route shared one picture and
 * the card said nothing about the route — not the map, not the hero, not who
 * wrote it. Build orders had generated cards from the start; this is the same
 * `OgCard`, with a route's facts in it. */

export const alt = "A Warcraft III creep route";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const route = await getCreepRouteBySlug(slug);
  const level = ROUTE_LEVELS.find((l) => l.id === route?.level)?.label;

  return new ImageResponse(
    (
      <OgCard
        kicker={route ? `Creep route · ${route.map.name}` : "Creep route"}
        title={route?.title ?? "Creep route"}
        subtitle={route ? `${RACES[route.race].label} vs ${vsLabel(route.vsRaces)}` : undefined}
        accent={route ? OG_RACE_COLOUR[route.race] : undefined}
        facts={[
          ...(route ? [{ label: "Stops", value: String(route.stops.length), tone: "gold" as const }] : []),
          ...(level ? [{ label: "Level", value: level }] : []),
          ...(route?.author ? [{ label: "By", value: route.author }] : []),
        ]}
      />
    ),
    { ...size, fonts: await ogFonts() },
  );
}
