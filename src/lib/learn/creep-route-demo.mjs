/** The example in the guide "Understanding creep routes": a Night Elf
 *  Demon Hunter route on Springtime, copied from the live route `source`
 *  (stops, units, kill orders and notes), then stop `zoom.stop` as a
 *  playable kill order. `presets[0]` is the route's own order. The test
 *  next to this file checks the kills fit. */
export const CREEP_ROUTE_DEMO = {
  map: "springtime",
  source: "st-dh-fast-3rd-level-afdb",
  author: "AllSupGoToHeaven",
  stops: [
    {
      campId: "c09",
      kills: [{ row: 1, n: 1 }],
      units: [{ icon: "ne-demon-hunter", count: 1 }, { icon: "ne-ancient-of-war", count: 1 }, { icon: "ne-archer", count: 1 }],
      note: "Get the item and run over to next camp to creep with immolation or evasion. Finish off the camp with archers and AoW. do NOT lose xp.",
    },
    { campId: "c01", units: [{ icon: "ne-demon-hunter", count: 1 }] },
    { campId: "c19", units: [{ icon: "ne-demon-hunter", count: 1 }, { icon: "ne-archer", count: 1 }] },
    {
      campId: "c14",
      kills: [{ row: 2, n: 1 }],
      units: [{ icon: "ne-demon-hunter", count: 1 }, { icon: "ne-archer", count: 3 }],
      note: "Focus priest first, you can take a priest or a berserker from merc camp. If you do so, do not make more than 3 archers.",
    },
  ],
  zoom: {
    stop: 3,
    caption: "Stop 4, editable.",
    presets: [
      { label: "Priest first", kills: [{ row: 2, n: 1 }] },
      { label: "Priest, Sasquatch", kills: [{ row: 2, n: 1 }, { row: 3, n: 1 }] },
      { label: "Whole camp", kills: [] },
    ],
  },
};
