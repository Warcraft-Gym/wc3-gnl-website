/** The "Try it" block in the guide "Reading creep routes":
 *  Springtime's west Sasquatch camp (rows: Ice Troll Trapper, Frost Wolf,
 *  Forest Troll High Priest, Sasquatch) and kill orders from two live
 *  routes. The test next to this file checks the XP each order gives. */
export const KILL_ORDER_DEMO = {
  map: "springtime",
  camp: "c14",
  caption: "Springtime, west Sasquatch camp. The hero starts at level 1 with no XP.",
  presets: [
    { label: "Whole camp", kills: [] },
    { label: "Priest first", kills: [{ row: 2, n: 1 }] },
    { label: "Priest, Sasquatch", kills: [{ row: 2, n: 1 }, { row: 3, n: 1 }] },
  ],
};
