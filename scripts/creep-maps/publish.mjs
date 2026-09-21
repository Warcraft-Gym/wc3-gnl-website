#!/usr/bin/env node
/**
 * Publishes one or more generated map catalogues to Sanity as `creepMap`
 * documents: uploads the minimap PNG as an image asset and
 * `createOrReplace`s the document with a deterministic id, so re-running is
 * safe (an editor's manual camp-position nudges in the Studio are
 * overwritten by a re-publish, same trade-off as build orders' NDJSON seed).
 *
 *   node scripts/creep-maps/publish.mjs autumn-leaves echo-isles
 *   node scripts/creep-maps/publish.mjs --all
 *
 * Needs SANITY_API_WRITE_TOKEN (Editor scope) in the environment; exits 1
 * with a clear message if it's missing. Not run as part of this feature (no
 * token available) — see docs/creep-routes.md.
 *
 * @sanity/client isn't a direct dependency of this repo (it's transitive,
 * via `next-sanity`/`sanity`), and a plain `node` script can't resolve a
 * transitive package the way Next's bundler does. Resolved explicitly
 * through `next-sanity`'s own dependency tree instead of adding a
 * dependency.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

function resolveSanityClient() {
  const nextSanityPkg = require.resolve("next-sanity/package.json");
  const clientEntry = require.resolve("@sanity/client", { paths: [path.dirname(nextSanityPkg)] });
  return import(clientEntry);
}

const MAPS_DIR = fileURLToPath(new URL("../../src/lib/creep-routes/maps/", import.meta.url));
const PUBLIC_MAPS_DIR = fileURLToPath(new URL("../../public/maps/", import.meta.url));

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "4q3xdrt2";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.SANITY_API_VERSION || "2026-08-24";
const token = process.env.SANITY_API_WRITE_TOKEN;

function slugsFromArgs(argv) {
  if (argv.includes("--all")) {
    return readdirSync(MAPS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  }
  return argv.filter((a) => !a.startsWith("--"));
}

function loadCatalogue(slug) {
  const jsonPath = path.join(MAPS_DIR, `${slug}.json`);
  const pngPath = path.join(PUBLIC_MAPS_DIR, `${slug}.png`);
  if (!existsSync(jsonPath)) throw new Error(`no catalogue for "${slug}": ${jsonPath} does not exist`);
  if (!existsSync(pngPath)) throw new Error(`no minimap for "${slug}": ${pngPath} does not exist`);
  return { catalogue: JSON.parse(readFileSync(jsonPath, "utf8")), pngPath };
}

async function publishMap(client, slug) {
  const { catalogue, pngPath } = loadCatalogue(slug);
  const asset = await client.assets.upload("image", readFileSync(pngPath), {
    filename: `${slug}.png`,
  });
  const doc = {
    _id: `creepMap.${slug}`,
    _type: "creepMap",
    title: catalogue.name,
    slug: { _type: "slug", current: slug },
    w3cMapId: catalogue.w3cMapId,
    mapVersion: catalogue.mapVersion ?? undefined,
    minimap: { _type: "image", asset: { _type: "reference", _ref: asset._id } },
    sourceFile: catalogue.sourceFile,
    generatedAt: catalogue.generatedAt,
    bounds: catalogue.bounds,
    image: catalogue.image,
    camps: catalogue.camps.map((c) => ({ ...c, _type: "camp", _key: c.id })),
    starts: catalogue.starts.map((s, i) => ({ ...s, _type: "start", _key: `start-${i}` })),
    mines: catalogue.mines.map((m, i) => ({ ...m, _type: "mine", _key: `mine-${i}` })),
    shops: catalogue.shops.map((s) => ({ ...s, _type: "shop", _key: s.id })),
  };
  await client.createOrReplace(doc);
  console.log(`published ${slug}: creepMap.${slug} (${catalogue.camps.length} camps)`);
}

async function main() {
  const slugs = slugsFromArgs(process.argv.slice(2));
  if (!slugs.length) {
    console.error("usage: node scripts/creep-maps/publish.mjs <slug...> | --all");
    process.exit(1);
  }
  if (!token) {
    console.error(
      "SANITY_API_WRITE_TOKEN is not set. Get an Editor-scoped token from sanity.io/manage -> API -> Tokens " +
        "and set it in the environment (see docs/creep-routes.md).",
    );
    process.exit(1);
  }

  const { createClient } = await resolveSanityClient();
  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

  for (const slug of slugs) {
    await publishMap(client, slug);
  }
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
