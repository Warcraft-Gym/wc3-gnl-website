# Map sources

The Warcraft III map archives every creep-route catalogue is built from. These
are the **input** to `scripts/creep-maps/build.mjs`; nothing reads them at
runtime, and `mopaq`/`war3-model` are devDependencies, so they never ship.

They live in the repo so a rebuild is reproducible offline and does not depend
on W3Champions' GitHub repo still holding that exact file. Twelve maps is
about 2 MB.

## Adding or updating a map

```
pnpm maps:add path/to/1v1_NewMap_v1.0@1234.w3x
```

That copies the file in here and rebuilds everything downstream. See
`docs/creep-routes.md`, "When the ladder pool rotates".

Two naming schemes are understood:

- `1v1_<Name>_<version>@<w3cMapId>.w3x` — W3Champions' `clean_maps` naming;
  the `@<id>` supplies `w3cMapId` for free.
- anything else — the name and version come from the file name, and the map
  simply has no W3Champions identity (`w3cMapId: null`).

`pool.json` is the W3Champions ladder pool as it stood when these files were
fetched (`scripts/creep-maps/fetch-pool.mjs`), and supplies the display names.

## Provenance

Fetched from
[`w3champions/map-updater-scripts`](https://github.com/w3champions/map-updater-scripts)
(`maps/w3c_maps/clean_maps/`), the repo W3Champions builds the ladder pool
from. These are *clean* archives: no 512-byte `HM3W` header, just the MPQ.

That repository publishes no licence. The files are distributed freely by
W3Champions for ladder play; they remain the work of their respective map
authors and Blizzard.
