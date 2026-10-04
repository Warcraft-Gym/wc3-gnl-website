import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DerivedNode } from "@/lib/creep-routes/derive";
import { SplitXpSummary } from "./SplitXpSummary";

const result = (levelBefore: number, levelAfter: number, xpBefore: number, xpGained: number): DerivedNode => ({
  mode: "and", walked: 0, arms: [], levelBefore, levelAfter, xpBefore, xpGained,
});

describe("XP shared by simultaneous paths", () => {
  it("shows one level-up result after the paths, without marking a particular path", () => {
    const html = renderToStaticMarkup(<SplitXpSummary node={result(2, 3, 480, 249)} />);
    expect(html).toContain("+249 XP");
    expect(html).not.toContain("About");
    expect(html).toContain("Level up");
    expect(html).toContain("Lv 3");
  });

  it("still shows the shared total when the paths do not level the hero", () => {
    const html = renderToStaticMarkup(<SplitXpSummary node={result(2, 2, 300, 87)} />);
    expect(html).toContain("+87 XP");
    expect(html).toContain("Lv 2");
    expect(html).not.toContain("Level up");
  });
});
