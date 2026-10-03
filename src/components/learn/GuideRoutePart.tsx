import Link from "next/link";
import { CreepMapPlayground } from "@/components/creep-routes/CreepMapPlayground";
import { getCreepMapBySlug } from "@/lib/creep-routes/maps";
import { routeHas } from "@/lib/creep-routes/route-has.mjs";
import { getCreepRoutes } from "@/lib/creep-routes/routes";

/**
 * A live route's map or stop list inside a guide's text, read by slug from the same route list
 * as /learn/creep-routes. `slugs` are tried in order (a route can have one slug in Sanity and
 * another in the dev fixtures). With `needs`, a route that lacks that feature is skipped, so a
 * section never shows a route without the thing it explains. A `choice` key that names no split
 * of the route is ignored. No route found renders nothing, not an empty frame: the guide's text
 * around it must read well without it.
 */
export async function GuideRoutePart({
  slugs,
  part,
  choice,
  needs,
}: {
  slugs: string[];
  part: "map" | "stops";
  needs?: "split" | "and" | "waypoint" | "attack";
  /** The path each split shows first, by split key. */
  choice?: Record<string, number>;
}) {
  const routes = await getCreepRoutes();
  const route = slugs.map((s) => routes.find((r) => r.slug === s)).find((r) => r && (!needs || routeHas(r, needs)));
  const map = route ? await getCreepMapBySlug(route.map.slug) : undefined;
  if (!route || !map) return null;
  return (
    <figure className="my-6 text-base leading-normal">
      <div className={part === "map" ? "max-w-lg" : undefined}>
        <CreepMapPlayground map={map} route={route} show={part} startClosed={part === "stops"} initialChoice={choice} />
      </div>
      <figcaption className="mt-2 text-sm text-faint">
        <Link href={`/learn/creep-routes/${route.slug}`} className="hover:text-gold">
          Route by {route.author}
        </Link>
      </figcaption>
    </figure>
  );
}
