import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseUnitsDoo } from "../../../scripts/creep-maps/units-doo.mjs";

const FIXTURE = fileURLToPath(
  new URL("../../../scripts/creep-maps/__fixtures__/autumn-leaves/war3mapUnits.doo", import.meta.url),
);

test("parses the checked-in Autumn Leaves war3mapUnits.doo exactly", () => {
  const buffer = readFileSync(FIXTURE);
  const { version, subversion, units } = parseUnitsDoo(buffer);

  assert.equal(version, 8);
  assert.equal(subversion, 11);
  assert.equal(units.length, 101);

  const creeps = units.filter((u) => u.player === 24);
  assert.equal(creeps.length, 66);

  const passive = units.filter((u) => u.player === 27);
  assert.equal(passive.length, 33);

  const starts = units.filter((u) => u.typeId === "sloc");
  assert.equal(starts.length, 2);
  assert.deepEqual(
    starts.map((s) => [s.x, s.y]).sort((a, b) => a[0] - b[0]),
    [
      [-2176, -4672],
      [2176, 4672],
    ],
  );

  const mines = units.filter((u) => u.typeId === "ngol");
  assert.equal(mines.length, 6);
});

test("throws if a file does not have the W3do magic", () => {
  assert.throws(() => parseUnitsDoo(Buffer.from("not a doo file at all")), /magic/);
});

test("throws if the parsed length does not match the file length", () => {
  const buffer = readFileSync(FIXTURE);
  const truncated = buffer.subarray(0, buffer.length - 10);
  assert.throws(() => parseUnitsDoo(truncated));
});
