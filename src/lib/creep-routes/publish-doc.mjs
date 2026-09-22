/**
 * Pure `creepMap` document builder, factored out of
 * `scripts/creep-maps/publish.mjs` so it's directly testable with
 * `node --test` (that script itself talks to Sanity — network, no test) —
 * same "pull the pure part into src/lib" pattern `build.mjs` already
 * follows for `xp.mjs`/`camps.mjs`/`minimap-crop.mjs`. Given a generated
 * map catalogue (the parsed `maps/<slug>.json` shape) and the already-
 * uploaded minimap image asset's id, returns the exact document
 * `createOrReplace` writes — no network, no filesystem, no randomness (the
 * document id is deterministic: `creepMap-<slug>`).
 *
 * The id uses a hyphen, not a dot. Sanity treats a `.` in a document id as a
 * private namespace: such documents are readable only with a token, never by
 * the anonymous reader a public dataset serves the site with. `creepMap.<slug>`
 * published without error and was then invisible in production. Hyphens match
 * what build orders already use (`build-<slug>`).
 */

/** Keys a camp's `drops[]` (and each drop's own `items[]`) so Sanity's
 *  array-of-objects convention is satisfied all the way down (F011: new
 *  nested arrays, not present before this feature). A drop's own key is
 *  its dedupe identity (`class+level` or `id` — see `drops.mjs`); an item's
 *  key is just its id, unique within one drop's `items`. */
function keyDrop(drop, index) {
  const key = drop.kind === "class" ? `${drop.class}-${drop.level}` : drop.id;
  return {
    ...drop,
    _type: "drop",
    _key: key || `drop-${index}`,
    items: (drop.items ?? []).map((it) => ({ ...it, _type: "dropItem", _key: it.id })),
  };
}

/** `terrainBounds`/`cameraBounds` are optional on a catalogue (older
 *  fixtures/test doubles may omit them) — written through as-is when
 *  present, omitted from the document entirely when not, same as every
 *  other optional catalogue field here (code-a.md, "Must fix": these two
 *  never reached Sanity before). */
export function buildCreepMapDoc(slug, catalogue, minimapAssetId) {
  return {
    _id: `creepMap-${slug}`,
    _type: "creepMap",
    title: catalogue.name,
    slug: { _type: "slug", current: slug },
    w3cMapId: catalogue.w3cMapId,
    mapVersion: catalogue.mapVersion ?? undefined,
    minimap: { _type: "image", asset: { _type: "reference", _ref: minimapAssetId } },
    sourceFile: catalogue.sourceFile,
    generatedAt: catalogue.generatedAt,
    bounds: catalogue.bounds,
    terrainBounds: catalogue.terrainBounds ?? undefined,
    cameraBounds: catalogue.cameraBounds ?? undefined,
    image: catalogue.image,
    camps: catalogue.camps.map((c) => ({
      ...c,
      _type: "camp",
      _key: c.id,
      // Keyed by rawcode *and* index: since creeps group by type and by what
      // they drop, one camp can hold two rows of the same rawcode (the
      // Trapper carrying the permanent and the one carrying nothing). The
      // rawcode alone stopped being unique when per-creep drops landed, and
      // duplicate `_key`s break array editing in the Studio.
      creeps: (c.creeps ?? []).map((creep, i) => ({
        ...creep,
        _type: "creep",
        _key: `${creep.id}-${i}`,
      })),
      drops: (c.drops ?? []).map(keyDrop),
    })),
    starts: catalogue.starts.map((s, i) => ({ ...s, _type: "start", _key: `start-${i}` })),
    mines: catalogue.mines.map((m, i) => ({ ...m, _type: "mine", _key: `mine-${i}` })),
    shops: catalogue.shops.map((s) => ({ ...s, _type: "shop", _key: s.id })),
  };
}
