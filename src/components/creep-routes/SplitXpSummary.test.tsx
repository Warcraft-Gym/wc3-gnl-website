import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DerivedNode } from "@/lib/creep-routes/derive";
import { SplitXpSummary } from "./SplitXpSummary";

const result = (levelBefore: number, levelAfter: number, xpBefore: number, xpGained: number): DerivedNode => ({
  mode: "and", walked: 0, arms: [], levelBefore, levelAfter, xpBefore, xpGained,
});

describe("XP shared by simultaneous paths", () => {
  it("marks the level with the gold tag when the paths level the hero", () => {
    const html = renderToStaticMarkup(<SplitXpSummary node={result(2, 3, 480, 249)} />);
    expect(html).toContain("+249 xp");
    expect(html).toContain("Level up: Lv 3");
    expect(html).toContain("text-gold");
  });

  it("shows plain text when the paths do not level the hero", () => {
    const html = renderToStaticMarkup(<SplitXpSummary node={result(2, 2, 300, 87)} />);
    expect(html).toContain("+87 xp");
    expect(html).toContain("Lv 2");
    expect(html).not.toContain("Level up");
    expect(html).not.toContain("text-gold");
  });
});
