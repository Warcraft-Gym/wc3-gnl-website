import "server-only";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";
import { COMMUNITY_TOOL_GROUPS, type ToolGroup } from "@/lib/tools";

/**
 * Community tools for /tools, read from Sanity `tool` documents and grouped
 * in the fixed group order; falls back to the bundled list in tools.ts when
 * Sanity is unreachable so the page always renders.
 */

export const GROUP_ORDER: { id: string; title: string; blurb?: string }[] = [
  { id: "ladder", title: "Ladder" },
  { id: "replays", title: "Replay parsers", blurb: "Drop in a replay and see what actually happened: every unit, building and upgrade, timed." },
  { id: "overlays", title: "Build order overlays" },
  { id: "streaming", title: "For streamers" },
  { id: "other", title: "Other cool tools" },
];

export type CommunityTool = {
  id: string;
  title: string;
  url: string;
  group: string;
  by?: string;
  body: string;
  badge?: string;
  /** Sanity image source, or a `/tools/...` path from the fixtures. */
  image?: unknown;
  imagePath?: string;
};

export type CommunityToolGroup = { title: string; blurb?: string; tools: CommunityTool[] };

const PROJECTION = `{
  "id": _id, title, url, group, by, body, badge, image
}`;

async function fromSanity(): Promise<CommunityTool[] | null> {
  const client = sanityClient();
  if (!client) return null;
  try {
    return await client.fetch<CommunityTool[]>(
      `*[_type == "tool" && live != false && defined(url)] | order(group asc, order asc, title asc) ${PROJECTION}`,
      {},
      { next: { revalidate: 300 } },
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[tools] Sanity tool list failed, using fixtures -", String(err));
    }
    return null;
  }
}

function fixtureGroups(): CommunityToolGroup[] {
  return COMMUNITY_TOOL_GROUPS.map((g: ToolGroup) => ({
    title: g.title,
    blurb: g.blurb,
    tools: g.tools.map((t) => ({
      id: t.href,
      title: t.title,
      url: t.href,
      group: g.title,
      by: t.by,
      body: t.body,
      badge: t.badge,
      imagePath: t.image,
    })),
  }));
}

export async function getCommunityToolGroups(): Promise<CommunityToolGroup[]> {
  if (isSanityConfigured()) {
    const live = await fromSanity();
    if (live && live.length) {
      return GROUP_ORDER.map((g) => ({
        title: g.title,
        blurb: g.blurb,
        tools: live.filter((t) => t.group === g.id),
      })).filter((g) => g.tools.length);
    }
  }
  return fixtureGroups();
}
