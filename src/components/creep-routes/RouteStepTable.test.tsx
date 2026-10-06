// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { FIXTURE_MAPS, FIXTURE_ROUTES } from "@/lib/creep-routes/fixtures";
import { RouteStepTable } from "./RouteStepTable";

afterEach(cleanup);

describe("simultaneous paths in the route list", () => {
  it("open and close together under the split heading, which holds the only level", () => {
    const route = structuredClone(FIXTURE_ROUTES.find((r) => r.slug === "human-no-expansion-tidehunters")!);
    route.stops[1].split!.arms[0].stops.push({ campId: "c05", note: "A second action on this path" });
    const map = FIXTURE_MAPS.find((m) => m.slug === route.map.slug)!;
    function OpenableTable() {
      const [open, setOpen] = useState(new Set(["0", "1"]));
      const toggle = (key: string) => setOpen((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      return <RouteStepTable route={route} map={map} open={open} onSummary={toggle} onChevron={toggle} onExpandAll={() => {}} onCollapseAll={() => {}} />;
    }
    render(<OpenableTable />);
    const split = screen.getByText("Take all paths simultaneously").closest("li")!;
    const heading = within(split).getByRole("button", { name: /^Take all paths simultaneously, hero Lv \d+, \d+ xp$/ });
    const paths = split.nextElementSibling as HTMLElement;
    const stops = () => [...paths.querySelectorAll("li[data-stop]")] as HTMLElement[];
    expect(stops()).toHaveLength(3);
    // No path stop has its own chevron or level, open or closed.
    expect(within(paths).queryAllByRole("button", { name: /stop \d+ details/i })).toHaveLength(0);
    expect(heading.getAttribute("aria-expanded")).toBe("true");
    expect(within(split).getByText(/\d+ \/ \d+ xp/)).toBeTruthy();
    for (const stop of stops()) {
      expect(within(stop).getByRole("button", { name: /^Stop / }).getAttribute("aria-expanded")).toBe("true");
      expect(within(stop).queryByText(/Lv \d+ · \d+ xp|\d+ \/ \d+ xp/)).toBeNull();
    }
    fireEvent.click(heading);
    expect(heading.getAttribute("aria-expanded")).toBe("false");
    expect(within(split).getByText(/Lv \d+ · \d+ xp/)).toBeTruthy();
    for (const stop of stops()) expect(within(stop).getByRole("button", { name: /^Stop / }).getAttribute("aria-expanded")).toBe("false");
  });
});
