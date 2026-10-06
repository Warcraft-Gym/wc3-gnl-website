import test from "node:test";
import assert from "node:assert/strict";
import { CAP_AT, CAP_OVER, MAX_IMAGE_BYTES, MAX_PATHS, MAX_ROWS, MAX_STOP_IMAGES, MAX_STOPS, addBlocked, capProblems, rowCount } from "./caps.mjs";

const camp = (i) => ({ campId: `c${i}` });
const waypoint = () => ({ campId: null, action: "Scout", place: { kind: "scout", at: { start: "1" } } });
const split = (...arms) => ({ campId: null, split: { mode: "or", arms: arms.map((stops) => ({ label: "x", stops })) } });
const camps = (n) => Array.from({ length: n }, (_, i) => camp(i));

test("the caps are 3 paths, 12 numbered stops and 20 rows", () => {
  assert.deepEqual([MAX_PATHS, MAX_STOPS, MAX_ROWS], [3, 12, 20]);
  assert.equal(CAP_AT.stops, "This route is at the cap of 12 numbered stops. Ask on Discord if you need more.");
  assert.equal(CAP_AT.rows, "This route is at the cap of 20 rows. Ask on Discord if you need more.");
  assert.equal(CAP_AT.paths, "This block is at the cap of 3 paths. Ask on Discord if you need more.");
});

test("a stop takes 3 pictures of 5 MB at most; the lines give the limits", () => {
  assert.deepEqual([MAX_STOP_IMAGES, MAX_IMAGE_BYTES], [3, 5_242_880]);
  assert.equal(CAP_OVER.images, "This stop is over the cap of 3 pictures. Ask on Discord if you need more.");
  assert.equal(CAP_OVER.imageBytes, "This picture is over the cap of 5 MB. Save the screenshot as JPEG and upload it again.");
});

test("a row is a stop, a waypoint or a split, a path's stops included; Sanity's creepSplit counts too", () => {
  assert.equal(rowCount([camp(1), waypoint(), split([camp(2), camp(3)], [camp(4)])]), 6);
  assert.equal(rowCount([{ _type: "creepSplit", arms: [{ stops: [camp(1)] }, { stops: [camp(2)] }] }]), 3);
  assert.equal(rowCount(undefined), 0);
});

test("stop cap: at 12 numbered stops a camp or an attack is blocked, a waypoint is not", () => {
  const twelve = camps(12);
  assert.equal(addBlocked(camps(11), "stop"), null);
  assert.equal(addBlocked(twelve, "stop"), CAP_AT.stops);
  assert.equal(addBlocked(twelve, "row"), null);
  // A split counts its longest path: 10 at the top and a path of 2 read up to 12.
  assert.equal(addBlocked([...camps(10), split([camp(10), camp(11)], [camp(12)])], "stop"), CAP_AT.stops);
  assert.equal(addBlocked([...camps(10), split([camp(10)], [camp(11)])], "stop"), null);
});

test("row cap: at 20 rows nothing more is added, a waypoint or a split included", () => {
  const rows = [...camps(10), ...Array.from({ length: 10 }, waypoint)];
  assert.equal(rowCount(rows), 20);
  assert.equal(addBlocked(rows, "row"), CAP_AT.rows);
  assert.equal(addBlocked(rows, "stop"), CAP_AT.rows);
  assert.equal(addBlocked(rows.slice(1), "row"), null);
});

test("path cap: a split with 3 paths takes no fourth", () => {
  assert.equal(addBlocked([], "path", split([camp(1)], [camp(2)])), null);
  assert.equal(addBlocked([], "path", split([camp(1)], [camp(2)], [camp(3)])), CAP_AT.paths);
});

test("capProblems: past a cap, the submit check and the Studio repeat the line", () => {
  assert.deepEqual(capProblems(camps(12)), []);
  assert.deepEqual(capProblems(camps(13)), [{ path: [], message: CAP_OVER.stops }]);
  const rows = [...camps(5), ...Array.from({ length: 16 }, waypoint)];
  assert.deepEqual(capProblems(rows), [{ path: [], message: CAP_OVER.rows }]);
  assert.deepEqual(capProblems([camp(0), split([camp(1)], [camp(2)], [camp(3)], [camp(4)])]), [{ path: [1], message: CAP_OVER.paths }]);
});
