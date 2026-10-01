import { RouteRow } from "@/components/creep-routes/RouteRow";
import { guideRoutes } from "@/lib/creep-routes/related.mjs";
import { getCreepRoutes } from "@/lib/creep-routes/routes";
import type { CreepRoute } from "@/lib/creep-routes/types";

/** Up to three route rows under a guide's example: two on its map, then the
 *  route list's top pick. Reads the same cached route list as /learn/creep-routes. */
export async function GuideRouteList({ mapSlug, exclude }: { mapSlug: string; exclude?: string }) {
  const routes: CreepRoute[] = guideRoutes(await getCreepRoutes(), { mapSlug, exclude });
  if (!routes.length) return null;
  return (
    <section className="my-10 leading-normal">
      <h2 className="mb-4 text-[1.05rem] font-bold tracking-[0.06em] text-fg">More creep routes</h2>
      <ul className="grid gap-3">
        {routes.map((r) => (
          <RouteRow key={r.slug} route={r} />
        ))}
      </ul>
    </section>
  );
}
