// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { FIXTURE_MAPS, FIXTURE_ROUTES } from "@/lib/creep-routes/fixtures";
import { RouteStepTable } from "./RouteStepTable";

afterEach(cleanup);

describe("simultaneous paths in the route list", () => {
  it("keeps one shared hero meter when several path stops are open", () => {
    const route = structuredClone(FIXTURE_ROUTES.find((r) => r.slug === "human-no-expansion-tidehunters")!);
    route.stops[1].split!.arms[0].stops.push({ campId: "c05", note: "A second action on this path" });
    const map = FIXTURE_MAPS.find((m) => m.slug === route.map.slug)!;
    function OpenableTable() {
      const [open, setOpen] = useState(new Set(["0", "1.a.0", "1.a.1", "1.b.0", "2"]));
      const toggle = (key: string) => setOpen((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      return <RouteStepTable route={route} map={map} open={open} onSummary={toggle} onChevron={toggle} onExpandAll={() => {}} onCollapseAll={() => {}} />;
    }
    const { container } = render(<OpenableTable />);
    const split = screen.getByText("At the same time").closest("li")!;
    const paths = split.nextElementSibling!;
    const stops = paths.querySelectorAll("li[data-stop]");
    expect(stops).toHaveLength(3);
    for (const stop of stops) {
      expect(within(stop as HTMLElement).queryByText(/\d+\s*\/\s*\d+\s*xp/i)).toBeNull();
    }
    expect(within(paths as HTMLElement).getAllByRole("button", { name: /hide stop \d+ details/i })).toHaveLength(3);
    expect(container.querySelectorAll('[role="group"][aria-label="XP and level after all paths at the same time"]')).toHaveLength(1);
    fireEvent.click(within(paths as HTMLElement).getAllByRole("button", { name: /hide stop \d+ details/i })[0]);
    expect(within(paths as HTMLElement).getAllByRole("button", { name: /hide stop \d+ details/i })).toHaveLength(2);
    expect(container.querySelectorAll('[role="group"][aria-label="XP and level after all paths at the same time"]')).toHaveLength(1);
  });
});
