import { describe, expect, it, vi } from "vitest";
import { FIXTURE_MAPS, FIXTURE_ROUTES } from "@/lib/creep-routes/fixtures";

vi.mock("@/lib/creep-routes/routes", () => ({ getCreepRoutes: async () => FIXTURE_ROUTES }));
vi.mock("@/lib/creep-routes/maps", () => ({ getCreepMapBySlug: async (slug: string) => FIXTURE_MAPS.find((m) => m.slug === slug) }));

const { GuideRoutePart } = await import("./GuideRoutePart");

describe("GuideRoutePart: a guide's live route part", () => {
  it("renders nothing, not an empty frame, when the route is not there", async () => {
    expect(await GuideRoutePart({ slugs: ["not-a-route"], part: "map" })).toBeNull();
    expect(await GuideRoutePart({ slugs: [], part: "stops" })).toBeNull();
  });

  it("takes the first slug that exists (a Sanity slug, then the fixture's)", async () => {
    const el = await GuideRoutePart({ slugs: ["early-creep-route-vs-solo-blademaster-windwalk-b1c6", "undead-ves-autumn-leaves"], part: "stops" });
    expect(el).not.toBeNull();
    expect(JSON.stringify(el?.props.children[1].props.children.props.href)).toContain("undead-ves-autumn-leaves");
  });
});
