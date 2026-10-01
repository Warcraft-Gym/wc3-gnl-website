/** The example in the guide "Reading creep routes": an orc Blademaster
 *  route on Springtime (camps and kill orders from a live route, notes left
 *  out), then stop `zoom.stop` as a playable kill order. `presets[0]` is the
 *  route's own order. The test next to this file checks the kills fit. */
export const CREEP_ROUTE_DEMO = {
  map: "springtime",
  caption: "An orc Blademaster route on Springtime.",
  stops: [
    { campId: "c09", kills: [{ row: 1, n: 1 }, { row: 2, n: 1 }, { row: 0, n: 1 }] },
    { campId: "c19", kills: [{ row: 0, n: 1 }, { row: 2, n: 1 }, { row: 1, n: 1 }] },
    { campId: "c14", kills: [{ row: 2, n: 1 }, { row: 3, n: 1 }] },
    { campId: "c06", kills: [{ row: 0, n: 2, set: 1 }, { row: 1, n: 1 }] },
  ],
  zoom: {
    stop: 2,
    caption: "Stop 3 of the route above.",
    presets: [
      { label: "Priest, Sasquatch", kills: [{ row: 2, n: 1 }, { row: 3, n: 1 }] },
      { label: "Priest first", kills: [{ row: 2, n: 1 }] },
      { label: "Whole camp", kills: [] },
    ],
  },
};
