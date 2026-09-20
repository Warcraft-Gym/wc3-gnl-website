import { test } from "node:test";
import assert from "node:assert/strict";
import { vsRaceOfSeason } from "./w3c-vs-race.mjs";

/** The shape of the W3Champions payload, cut down to what the parser reads. */
const payload = {
  raceWinsOnMapByPatch: {
    "2.0.4": [{ race: 16, winLossesOnMap: [{ map: "Overall", winLosses: [{ race: 1, wins: 1, losses: 0, games: 1 }] }] }],
    All: [
      { race: 2, winLossesOnMap: [{ map: "Overall", winLosses: [{ race: 1, wins: 7, losses: 3, games: 10 }] }] },
      {
        race: 16,
        winLossesOnMap: [
          { map: "EchoIsles", winLosses: [{ race: 1, wins: 2, losses: 1, games: 3 }] },
          {
            map: "Overall",
            winLosses: [
              { race: 0, wins: 38, losses: 40, games: 78 },
              { race: 1, wins: 55, losses: 68, games: 123 },
              { race: 2, wins: 65, losses: 75, games: 140 },
              { race: 8, wins: 39, losses: 52, games: 91 },
              { race: 4, wins: 37, losses: 63, games: 100 },
            ],
          },
        ],
      },
    ],
  },
};

test("reads the overall row of every own race, by opponent race", () => {
  const vs = vsRaceOfSeason(payload);
  assert.deepEqual(vs, {
    random: { wins: 38, losses: 40 },
    human: { wins: 55, losses: 68 },
    orc: { wins: 65, losses: 75 },
    undead: { wins: 39, losses: 52 },
    nightelf: { wins: 37, losses: 63 },
  });
  const sum = Object.values(vs).reduce((a, r) => ({ wins: a.wins + r.wins, losses: a.losses + r.losses }), { wins: 0, losses: 0 });
  assert.deepEqual(sum, { wins: 234, losses: 298 });
});

test("drops a row with no games and an unknown race id", () => {
  const vs = vsRaceOfSeason({
    raceWinsOnMapByPatch: {
      All: [
        {
          race: 16,
          winLossesOnMap: [
            {
              map: "Overall",
              winLosses: [
                { race: 1, wins: 3, losses: 2, games: 5 },
                { race: 2, wins: 0, losses: 0, games: 0 },
                { race: 64, wins: 4, losses: 4, games: 8 },
              ],
            },
          ],
        },
      ],
    },
  });
  assert.deepEqual(vs, { human: { wins: 3, losses: 2 } });
});

test("returns null when the payload has no overall row for all races", () => {
  assert.equal(vsRaceOfSeason(null), null);
  assert.equal(vsRaceOfSeason({}), null);
  assert.equal(vsRaceOfSeason({ raceWinsOnMapByPatch: { All: [] } }), null);
  assert.equal(
    vsRaceOfSeason({ raceWinsOnMapByPatch: { All: [{ race: 16, winLossesOnMap: [{ map: "EchoIsles", winLosses: [] }] }] } }),
    null,
  );
});
