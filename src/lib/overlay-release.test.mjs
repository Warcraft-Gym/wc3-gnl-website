import test from "node:test";
import assert from "node:assert/strict";
import { selectOverlayRelease } from "./overlay-release.mjs";

const REPO = "Warcraft-Gym/wc3-gym-overlay";

function release(overrides) {
  return {
    tag_name: "overlay-v0.5.0",
    html_url: `https://github.com/${REPO}/releases/tag/overlay-v0.5.0`,
    published_at: "2026-09-01T00:00:00Z",
    draft: false,
    prerelease: false,
    assets: [
      { name: "Warcraft-3-Gym-Overlay-Setup.exe", browser_download_url: "https://example.com/setup.exe" },
      { name: "Warcraft-3-Gym-Overlay-Portable.exe", browser_download_url: "https://example.com/portable.exe" },
      { name: "Warcraft-3-Gym-Overlay.dmg", browser_download_url: "https://example.com/mac.dmg" },
    ],
    ...overrides,
  };
}

test("skips a newer pre-release and returns the stable release under it", () => {
  const prerelease = release({
    tag_name: "overlay-v0.6.0-beta.1",
    html_url: `https://github.com/${REPO}/releases/tag/overlay-v0.6.0-beta.1`,
    published_at: "2026-10-02T00:00:00Z",
    prerelease: true,
    assets: [
      { name: "Warcraft-3-Gym-Overlay-Setup.exe", browser_download_url: "https://example.com/beta-setup.exe" },
      { name: "Warcraft-3-Gym-Overlay-Portable.exe", browser_download_url: "https://example.com/beta-portable.exe" },
      { name: "Warcraft-3-Gym-Overlay.dmg", browser_download_url: "https://example.com/beta-mac.dmg" },
    ],
  });
  const stable = release();
  const result = selectOverlayRelease([prerelease, stable], REPO);

  assert.equal(result.version, "0.5.0");
  assert.equal(result.url, stable.html_url);
  assert.equal(result.windowsInstaller, `https://github.com/${REPO}/releases/latest/download/Warcraft-3-Gym-Overlay-Setup.exe`);
  assert.equal(result.windowsPortable, `https://github.com/${REPO}/releases/latest/download/Warcraft-3-Gym-Overlay-Portable.exe`);
  assert.equal(result.macDmg, `https://github.com/${REPO}/releases/latest/download/Warcraft-3-Gym-Overlay.dmg`);
});

test("skips a draft release", () => {
  const draft = release({ tag_name: "overlay-v0.6.0", draft: true });
  const stable = release();
  const result = selectOverlayRelease([draft, stable], REPO);

  assert.equal(result.version, "0.5.0");
});

test("returns the only stable release untouched when there is no pre-release or draft", () => {
  const stable = release();
  const result = selectOverlayRelease([stable], REPO);

  assert.deepEqual(result, {
    version: "0.5.0",
    url: stable.html_url,
    publishedAt: stable.published_at,
    windowsInstaller: `https://github.com/${REPO}/releases/latest/download/Warcraft-3-Gym-Overlay-Setup.exe`,
    windowsPortable: `https://github.com/${REPO}/releases/latest/download/Warcraft-3-Gym-Overlay-Portable.exe`,
    macDmg: `https://github.com/${REPO}/releases/latest/download/Warcraft-3-Gym-Overlay.dmg`,
  });
});

test("ignores tags that are not an overlay release", () => {
  const other = release({ tag_name: "site-v1.0.0" });
  const result = selectOverlayRelease([other], REPO);

  assert.equal(result, null);
});

test("returns null for an empty or non-array list", () => {
  assert.equal(selectOverlayRelease([], REPO), null);
  assert.equal(selectOverlayRelease(null, REPO), null);
});
