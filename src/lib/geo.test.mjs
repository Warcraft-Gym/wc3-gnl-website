import { test } from "node:test";
import assert from "node:assert/strict";
import { CONSENT_REQUIRED_COUNTRIES, consentRequired } from "./geo.mjs";

test("the EEA, the UK and Switzerland are asked", () => {
  for (const c of ["DE", "FR", "IE", "NL", "SE", "PL", "NO", "IS", "LI", "GB", "CH"]) {
    assert.equal(consentRequired(c), true, c);
  }
});

test("everywhere else is not", () => {
  for (const c of ["US", "CA", "BR", "AU", "JP", "KR", "RU", "UA", "TR", "CN", "IN"]) {
    assert.equal(consentRequired(c), false, c);
  }
});

test("an unknown country is asked, because not knowing is not permission", () => {
  // The header is absent on local work and anywhere that is not Vercel.
  for (const bad of [undefined, null, "", "  ", "unknown", 42, {}, "DEU"]) {
    assert.equal(consentRequired(bad), true, JSON.stringify(bad));
  }
  assert.equal(consentRequired("XX"), false, "a real two-letter code outside the list is simply outside it");
});

test("case and whitespace do not decide someone's rights", () => {
  for (const c of ["de", " de ", "Gb", "gb"]) assert.equal(consentRequired(c), true, c);
  for (const c of ["us", " us "]) assert.equal(consentRequired(c), false, c);
});

test("the list is the EEA plus GB and CH, and nothing has crept in", () => {
  assert.equal(CONSENT_REQUIRED_COUNTRIES.size, 32, "27 EU + 3 EEA + GB + CH");
  assert.ok(!CONSENT_REQUIRED_COUNTRIES.has("US"));
  assert.ok(!CONSENT_REQUIRED_COUNTRIES.has("EU"), "not a country code");
});
