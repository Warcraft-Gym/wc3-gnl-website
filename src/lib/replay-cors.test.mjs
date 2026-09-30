import assert from "node:assert/strict";
import test from "node:test";
import { replayCorsHeaders } from "./replay-cors.mjs";

const ALLOWED = [
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://localhost:1420",
  "http://127.0.0.1:1420",
];

test("every allowlisted overlay origin gets its own origin echoed back with the full header set", () => {
  for (const origin of ALLOWED) {
    const headers = replayCorsHeaders(origin);
    assert.equal(headers["Access-Control-Allow-Origin"], origin);
    assert.equal(headers["Access-Control-Allow-Methods"], "POST, OPTIONS");
    assert.equal(headers["Access-Control-Allow-Headers"], "Content-Type");
    assert.equal(headers["Access-Control-Max-Age"], "600");
    assert.equal(headers.Vary, "Origin");
  }
});

test("look-alike origins are rejected: no prefix/suffix tricks, no null, no trailing slash", () => {
  const rejected = [
    "http://tauri.localhost.evil.com",
    "http://evil.com/http://tauri.localhost",
    "https://evil.example",
    "null",
    "http://tauri.localhost/",
    "HTTP://TAURI.LOCALHOST",
  ];
  for (const origin of rejected) {
    const headers = replayCorsHeaders(origin);
    assert.equal(headers["Access-Control-Allow-Origin"], undefined, origin);
    assert.equal(headers.Vary, "Origin");
  }
});

test("a missing Origin header gets no Access-Control-Allow-Origin, but still Vary", () => {
  for (const origin of [undefined, null, ""]) {
    const headers = replayCorsHeaders(origin);
    assert.equal(headers["Access-Control-Allow-Origin"], undefined);
    assert.equal(headers.Vary, "Origin");
  }
});
