import { RouteRow } from "@/components/creep-routes/RouteRow";
import { featuredFirst } from "@/lib/creep-routes/filter";
import { getCreepRoutes } from "@/lib/creep-routes/routes";
import type { CreepRoute } from "@/lib/creep-routes/types";

/** The route list's top three picks (featured first, then newest), under a
 *  guide. Reads the same cached route list as /learn/creep-routes. */
export async function GuideRouteList() {
  const routes: CreepRoute[] = featuredFirst(await getCreepRoutes()).slice(0, 3);
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
