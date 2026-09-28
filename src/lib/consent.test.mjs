import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONSENT_KEY, DENIED, GRANTED,
  analyticsStorage, consentDefaultScript, parseConsent, readConsent, writeConsent,
} from "./consent.mjs";

/** A localStorage stand-in. `broken` throws like Safari in private mode. */
const store = (initial = {}, broken = false) => ({
  getItem: (k) => { if (broken) throw new Error("denied"); return k in initial ? initial[k] : null; },
  setItem: (k, v) => { if (broken) throw new Error("denied"); initial[k] = v; },
  read: () => initial,
});

test("only our two values parse; anything else is 'not asked yet'", () => {
  assert.equal(parseConsent(GRANTED), GRANTED);
  assert.equal(parseConsent(DENIED), DENIED);
  for (const bad of [null, undefined, "", "yes", "true", "GRANTED", 1, {}]) {
    assert.equal(parseConsent(bad), null, JSON.stringify(bad));
  }
});

test("a missing choice is never consent", () => {
  assert.equal(readConsent(store()), null);
  assert.equal(analyticsStorage(readConsent(store())), DENIED);
});

test("storage that throws fails closed rather than crashing the page", () => {
  assert.equal(readConsent(store({}, true)), null);
  assert.equal(writeConsent(store({}, true), GRANTED), false);
  assert.equal(readConsent(undefined), null);
});

test("a stored choice is read back", () => {
  const s = store();
  assert.equal(writeConsent(s, GRANTED), true);
  assert.equal(readConsent(s), GRANTED);
  assert.equal(analyticsStorage(readConsent(s)), GRANTED);
  writeConsent(s, DENIED);
  assert.equal(analyticsStorage(readConsent(s)), DENIED);
});

test("a junk value cannot be written", () => {
  const s = store();
  assert.equal(writeConsent(s, "sure"), false);
  assert.equal(readConsent(s), null);
});

test("only an explicit grant grants", () => {
  assert.equal(analyticsStorage(GRANTED), GRANTED);
  for (const v of [DENIED, null, undefined, "granted "]) assert.equal(analyticsStorage(v), DENIED);
});

test("the inline default denies advertising outright and reads the stored choice", () => {
  const js = consentDefaultScript();
  assert.match(js, /ad_storage:'denied'/);
  assert.match(js, /ad_user_data:'denied'/);
  assert.match(js, /ad_personalization:'denied'/);
  assert.ok(js.includes(CONSENT_KEY), "must read the same key the banner writes");
  assert.match(js, /try\{/, "must not throw where localStorage is blocked");
  // The default call is what gtag applies at config time, so it has to decide
  // analytics_storage from storage rather than hardcode denied.
  assert.match(js, /analytics_storage:c==='granted'\?'granted':'denied'/);
});
