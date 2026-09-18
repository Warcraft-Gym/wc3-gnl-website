/**
 * Seeds the community tools from src/lib/tools.ts into Sanity `tool`
 * documents (deterministic `tool-<slug>` ids) with the preview images in
 * public/tools uploaded as assets. Re-running with --replace is safe.
 *
 *   node scripts/seed-tools.mjs
 *   SANITY_AUTH_TOKEN=<token> npx sanity dataset import scripts/tools.ndjson --dataset production --replace
 */
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("src/lib/tools.ts", "utf8");
const GROUP_IDS = { "Ladder": "ladder", "Replay parsers": "replays", "Build order overlays": "overlays", "For streamers": "streaming", "Other cool tools": "other" };

// Pull each tool object out of the TS source: enough structure for a seed.
const groups = [...src.matchAll(/title: "([^"]+)",\s*(?:blurb: "[^"]*",\s*)?tools: \[([\s\S]*?)\n    \],/g)];
const docs = [];
for (const [, groupTitle, body] of groups) {
  const group = GROUP_IDS[groupTitle];
  if (!group) continue;
  const tools = [...body.matchAll(/\{\s*href: "([^"]+)",\s*image: "([^"]+)",\s*Icon: \w+,\s*title: "([^"]+)",\s*(?:badge: "([^"]+)",\s*)?(?:by: "([^"]+)",\s*)?body:\s*"((?:[^"\\]|\\.)*)",\s*\}/g)];
  tools.forEach(([, href, image, title, badge, by, bodyText], i) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    docs.push({
      _id: `tool-${slug}`,
      _type: "tool",
      title,
      url: href,
      group,
      ...(by ? { by } : {}),
      body: bodyText.replace(/\\"/g, '"'),
      ...(badge ? { badge } : {}),
      order: (i + 1) * 10,
      live: true,
      image: { _type: "image", _sanityAsset: `image@file://${process.cwd()}/public${image}` },
    });
  });
}
writeFileSync("scripts/tools.ndjson", docs.map((d) => JSON.stringify(d)).join("\n") + "\n");
console.log(`wrote scripts/tools.ndjson: ${docs.length} tools`);
