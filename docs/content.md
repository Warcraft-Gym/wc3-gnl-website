# Content (Sanity)

Guides, build orders and news live in Sanity. The Studio is embedded in this
app at `/studio`, so editors sign in at `warcraft3.gym/studio` and never touch
the code. Everything else on the site (the about pages, the tools list, the
race and topic hubs) is plain code.

## What is in the dataset

| Type | Where it shows | Schema |
| --- | --- | --- |
| `guide` | `/learn/<category>` hubs and `/learn/guide/<slug>` | `src/sanity/schemaTypes/guide.ts` |
| `buildOrder` | `/learn/builds`, build pages, the homepage, `/api/builds` | `src/sanity/schemaTypes/buildOrder.ts`, see [`build-orders.md`](build-orders.md) |
| `post` | `/blog` | `src/sanity/schemaTypes/post.ts` |
| `tool` | `/tools`, the community tools cards | `src/sanity/schemaTypes/tool.ts` |

The desk (`src/sanity/structure.ts`) shows build orders first with the
**Pending review** queue for public submissions, then posts, guides and
tools.

### Guides

Fields: `title`, `slug`, `category` (one of the fixed categories in
`src/lib/learn/data.ts`: `new-players`, `human`, `night-elf`, `orc`, `undead`,
`creep-routes`, `mechanics`), `level`, `excerpt`, `readingMinutes`,
`publishedAt`, `coverImage`, `body` (Portable Text with images and YouTube
embeds) and `legacyId` (the WordPress post id, kept for redirects).

A category can render one guide in full at the top of its hub: set
`featuredGuide` on the category in `src/lib/learn/data.ts`. The new-players
hub does this with the New / Returning Players handbook.

A build order can point back at the guide it was transcribed from (the
**Companion guide** reference on `buildOrder`); the two pages then link to
each other.

### Tools

Each `tool` is one card on `/tools`: `title`, `url`, `group` (Ladder, Replay
parsers, Build order overlays, For streamers, Other cool tools), `by`
(maker credit), `body`, `image` (a 16:9 screenshot), optional `badge`,
`order` within the group, and `live` to hide a card without deleting it.
The groups and their order are fixed in `src/lib/tools-data.ts`; the cards
inside them are entirely editor-managed. The Gym's own apps (the overlay) stay
in code in `src/lib/tools.ts`.

### Posts

Fields: `title`, `slug`, `excerpt`, `category` (`news`, `recap`, `guide`,
`announcement`), `author`, `publishedAt`, `readingMinutes`, `coverImage`,
`body`.

## How the site reads it

`src/lib/learn/guides.ts`, `src/lib/builds/builds.ts`,
`src/lib/content/index.ts` and `src/lib/tools-data.ts` are the only modules
that query Sanity. Each uses
the published perspective through the CDN, caches for five minutes (ISR) and
falls back to bundled fixtures when the project is unreachable, so the site
never renders empty. Nothing in the UI imports Sanity directly, which keeps
the CMS swappable.

Lists fetch metadata only; bodies are fetched per page, because fetching every
body at once exceeds the Next.js fetch-cache limit.

### Instant updates

Edits show up within five minutes on their own. For instant updates, add a
webhook in sanity.io/manage (project → API → Webhooks):

- URL: `https://warcraft3.gym/api/revalidate`
- Trigger on: create, update, delete
- Filter: `_type in ["buildOrder", "post", "guide", "tool"]`
- Projection: `{ _type, slug }`
- Secret: a long random string, also set on Vercel as `SANITY_REVALIDATE_SECRET`

`src/app/api/revalidate/route.ts` verifies the signature and purges the pages
(and API routes) that render that document type.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` | Read access. `src/sanity/env.ts` defaults to the Gym project and `production`, so the Studio loads even when unset. |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Optional API version override. |
| `SANITY_API_WRITE_TOKEN` | Editor-scoped token, server-only. Needed by the build submission form. |
| `SANITY_REVALIDATE_SECRET` | Webhook secret, see above. |

## Migrations and imports

One-off scripts in `scripts/`, all writing NDJSON for
`npx sanity dataset import <file> --dataset production --replace` with an
Editor token in `SANITY_AUTH_TOKEN`:

| Script | What it does |
| --- | --- |
| `migrate-wp-guides.mjs` | WordPress learn posts → `guide` documents (deterministic `guide-<wpId>` ids, images uploaded on import) |
| `migrate-wp-news.mjs` | WordPress news posts → `post` documents |
| `migrate-wp-new-players.mjs` | The New / Returning Players handbook page → one `guide` (rebuilds headings from the WP layout, drops the anchor ToC) |
| `builds/to-ndjson.mjs <race>` | Transcribed build orders in `builds/<race>.mjs` → `buildOrder` documents. See [`build-orders.md`](build-orders.md). |
| `seed-tools.mjs` | The community tools in `src/lib/tools.ts` → `tool` documents, previews uploaded from `public/tools` |

Re-running an import with `--replace` is safe: ids are deterministic.

## Swapping the CMS later

Implement a new source behind the same `getGuides` / `getGuideBySlug`,
`getBuilds` / `getBuildBySlug` and `getPosts` / `getPostBySlug` contracts.
The pages and components do not know where the data comes from.
