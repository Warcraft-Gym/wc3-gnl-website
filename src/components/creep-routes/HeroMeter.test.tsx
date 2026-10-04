import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LevelLine } from "./HeroMeter";

describe("a closed row's level line", () => {
  it("carries the gold level-up mark only when the row levels the hero", () => {
    const up = renderToStaticMarkup(<LevelLine level={3} xp={552} leveled />);
    expect(up).toContain("Level up: ");
    expect(up).toContain("text-gold");
    expect(up).toContain("Lv 3 · 552 xp");
    const flat = renderToStaticMarkup(<LevelLine level={2} xp={303} leveled={false} />);
    expect(flat).not.toContain("Level up");
    expect(flat).toContain("Lv 2 · 303 xp");
  });
});
