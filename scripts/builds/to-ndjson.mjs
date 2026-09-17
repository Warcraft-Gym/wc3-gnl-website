/**
 * Turns the compact build-order data in scripts/builds/<race>.mjs into NDJSON
 * for `sanity dataset import`. Steps are written as ["supply", "icon", "text"]
 * with an optional 4th "m:ss" clock time. Supply is the "5/11" style food
 * count from the Gym build cards (the number before the slash is stored; "?"
 * means unknown).
 *
 * Usage:
 *   node scripts/builds/to-ndjson.mjs orc
 *   SANITY_AUTH_TOKEN=<token> npx sanity dataset import scripts/builds/orc.ndjson --dataset production --replace
 */
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const race = process.argv[2];
if (!race) throw new Error("usage: to-ndjson.mjs <race>");
const { BUILDS } = await import(`./${race}.mjs`);

const key = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const block = (text, k) => ({
  _type: "block",
  _key: key(k + text),
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: key("s" + k + text), marks: [], text }],
});

const docs = BUILDS.map((b) => {
  const steps = b.steps.map(([supply, icon, instruction, time], i) => {
    const m = String(supply).match(/(\d+)/);
    if (instruction.length > 160) throw new Error(`${b.slug} step ${i + 1} is ${instruction.length} chars`);
    return {
      _type: "step",
      _key: key(b.slug + i + instruction),
      ...(time ? { time } : {}),
      ...(m ? { supply: Number(m[1]) } : {}),
      ...(icon ? { icon } : {}),
      instruction,
    };
  });
  if (b.summary.length > 200) throw new Error(`${b.slug} summary too long`);
  return {
    _id: `build-${b.slug}`,
    _type: "buildOrder",
    title: b.title,
    slug: { _type: "slug", current: b.slug },
    race,
    vsRace: b.vsRace ?? "any",
    difficulty: b.difficulty,
    ...(b.patch ? { patch: b.patch } : {}),
    tags: b.tags ?? [],
    summary: b.summary,
    author: b.author ?? "Gym Coaches",
    ...(b.authorDiscord ? { authorDiscord: b.authorDiscord } : {}),
    ...(b.guideId ? { guide: { _type: "reference", _ref: b.guideId } } : {}),
    reviewStatus: "approved",
    featured: false,
    publishedAt: b.publishedAt ?? "2026-09-17T00:00:00Z",
    steps,
    description: (b.description ?? []).map((p, i) => block(p, b.slug + i)),
  };
});

const out = `scripts/builds/${race}.ndjson`;
writeFileSync(out, docs.map((d) => JSON.stringify(d)).join("\n") + "\n");
console.log(`wrote ${out}: ${docs.length} builds, ${docs.reduce((n, d) => n + d.steps.length, 0)} steps`);
