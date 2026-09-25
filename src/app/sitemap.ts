import type { MetadataRoute } from "next";
import { playerPath } from "@/lib/slug.mjs";
import { LEARN_CATEGORIES } from "@/lib/learn/data";
import { getGuides } from "@/lib/learn/guides";
import { getBuilds } from "@/lib/builds/builds";
import { getCreepRoutes } from "@/lib/creep-routes/routes";
import { getPosts } from "@/lib/content";
import { getPlayers, getTeams, getWeeks } from "@/lib/api/gnl";
import { CREEP_ROUTES_LIVE, GNL_LADDER_LIVE, OVERLAY_BETA_LIVE } from "@/lib/flags";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

const page = (
  path: string,
  priority: number,
  changeFrequency: Entry["changeFrequency"],
  lastModified?: string | Date,
): Entry => ({
  url: absoluteUrl(path),
  priority,
  changeFrequency,
  ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
});

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [guides, builds, routes, { posts }, { teams }, { players }, { weeks }] = await Promise.all([
    safe(getGuides(), []),
    safe(getBuilds(), []),
    safe(CREEP_ROUTES_LIVE ? getCreepRoutes() : Promise.resolve([]), []),
    safe(getPosts(), { posts: [], source: "fixture" as const }),
    safe(getTeams(), { teams: [], source: "fixture" as const }),
    safe(getPlayers(), { players: [], source: "fixture" as const }),
    safe(getWeeks(), { weeks: [], source: "fixture" as const }),
  ]);

  const statics: Entry[] = [
    page("/", 1, "daily"),
    page("/learn", 0.9, "weekly"),
    page("/learn/guides", 0.7, "weekly"),
    page("/learn/builds", 0.9, "daily"),
    page("/king-of-the-hill", 0.6, "weekly"),
    page("/blog", 0.8, "daily"),
    page("/about", 0.6, "monthly"),
    page("/tools", 0.6, "monthly"),
    page("/privacy", 0.3, "yearly"),
    ...(OVERLAY_BETA_LIVE ? [page("/tools/overlay", 0.6, "monthly")] : []),
    page("/gnl/about", 0.7, "monthly"),
    page("/gnl/rules", 0.5, "monthly"),
    page("/gnl/schedule", 0.8, "daily"),
    page("/gnl/standings", 0.8, "daily"),
    page("/gnl/teams", 0.7, "weekly"),
    ...(GNL_LADDER_LIVE ? [page("/gnl/ladder", 0.6, "daily")] : []),
    page("/gnl/fantasy", 0.5, "weekly"),
  ];

  return [
    ...statics,
    ...LEARN_CATEGORIES.map((c) => page(`/learn/${c.id}`, 0.8, "weekly")),
    ...guides.map((g) => page(`/learn/guide/${g.slug}`, 0.7, "monthly", g.publishedAt)),
    ...builds.map((b) => page(`/learn/builds/${b.slug}`, 0.7, "monthly", b.updatedAt)),
    ...routes.map((r) => page(`/learn/creep-routes/${r.slug}`, 0.7, "monthly", r.updatedAt)),
    ...posts.map((p) => page(`/blog/${p.slug}`, 0.6, "monthly", p.publishedAt)),
    ...teams.map((t) => page(`/gnl/teams/${t.slug}`, 0.5, "weekly")),
    // One URL per player: the profile carries every season they played.
    ...[...new Map(players.map((p) => [p.slug, p])).values()].map((p) => page(playerPath(p.id, p.name), 0.5, "weekly")),
    ...weeks.map((w) => page(`/gnl/schedule/${w.number}`, 0.5, "daily")),
  ];
}
