import assert from "node:assert/strict";
import test from "node:test";
import { parseIniField, iconKeyFromArt } from "../../../scripts/creep-maps/txt-sections.mjs";

const SAMPLE = `
[nftt]
Art=ReplaceableTextures\\CommandButtons\\BTNForestTrollTrapper.blp
Missileart=Abilities\\Weapons\\Axe\\AxeMissile.mdl

// forest troll king
[nftk]
Art=ReplaceableTextures\\CommandButtons\\BTNForestTroll.blp

[nnom]
`;

test("parseIniField reads one field per [section]", () => {
  const art = parseIniField(SAMPLE, "Art");
  assert.equal(art.get("nftt"), "ReplaceableTextures\\CommandButtons\\BTNForestTrollTrapper.blp");
  assert.equal(art.get("nftk"), "ReplaceableTextures\\CommandButtons\\BTNForestTroll.blp");
  assert.equal(art.has("nnom"), false);
});

test("parseIniField reads a different field from the same shape", () => {
  const missile = parseIniField(SAMPLE, "Missileart");
  assert.equal(missile.get("nftt"), "Abilities\\Weapons\\Axe\\AxeMissile.mdl");
  assert.equal(missile.has("nftk"), false);
});

test("iconKeyFromArt strips the path and extension", () => {
  assert.equal(
    iconKeyFromArt("ReplaceableTextures\\CommandButtons\\BTNForestTrollTrapper.blp"),
    "BTNForestTrollTrapper",
  );
  assert.equal(iconKeyFromArt("ReplaceableTextures/CommandButtons/BTNHelmutPurple.blp"), "BTNHelmutPurple");
  assert.equal(iconKeyFromArt("BTNGem.blp"), "BTNGem");
});
