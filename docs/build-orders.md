# Build orders

Community build orders live under `/learn/builds`. Sanity is the store;
anyone can submit a build from the site, and an editor publishes it from the
Studio. There is no login and no voting in this version.

## How a build gets on the site

1. A visitor fills in **/learn/builds/submit** (metadata, timed steps with
   icons, notes, credit). No account needed.
2. The server action validates it, applies spam guards (honeypot, minimum
   fill time, one submission per IP per minute) and creates a **draft**
   `buildOrder` document in Sanity via a server-only write token.
3. The submission is stamped `reviewStatus: pending` and never reaches the
   site. In the Studio it appears under **Build orders → Pending review**.
   An editor opens it, edits if needed, sets **Review** to **Approved** and
   clicks **Publish**, or deletes it. Publish is blocked (validation error)
   while Review is still Pending, so a build cannot go live unreviewed.
   Builds created directly in the Studio default to Approved.
4. Published builds show up immediately if the Sanity webhook is set up
   (below), otherwise within five minutes (ISR revalidate 300).

### Instant updates (Sanity webhook)

In sanity.io/manage → project → API → Webhooks, add a webhook:

- URL: `https://warcraft3.gym/api/revalidate`
- Trigger on: create, update, delete
- Filter: `_type in ["buildOrder", "post", "guide"]`
- Projection: `{ _type, slug }`
- Secret: any long random string; put the same value in the Vercel env as
  `SANITY_REVALIDATE_SECRET`

The route verifies the signature and purges the pages that render that
document type.

Editors can also create builds directly in the Studio; same document type.

## Content model (`buildOrder`)

| Field | Notes |
|---|---|
| `title`, `slug` | slug is generated from the title on submission |
| `race`, `vsRaces` | `human` · `orc` · `nightelf` · `undead`; `vsRaces` is a list, empty means any opponent |
| `difficulty` | `beginner` · `intermediate` · `advanced` |
| `patch`, `tags`, `summary` | list metadata; summary is shown in the list |
| `author`, `authorDiscord`, `maintainer`, `sourceUrl` | credit |
| `reviewStatus` | `pending` (public submission, hidden from the site) or `approved`. The site only shows approved builds. |
| `featured` | **Build of the week**, shown in the homepage's build orders section. Turn it on for one build at a time; with none on, the homepage shows the newest build. |
| `guide` | Optional reference to the Learn guide the build came from; the build page shows a Full guide card and the guide page lists the build |
| `steps[]` | `{ time "mm:ss", supply, instruction, icon }`, `time` is optional and drives the play-along clock; the Time column is hidden when no step has one |
| `description` | Portable Text (same editor as guides) |

Schema: `src/sanity/schemaTypes/buildOrder.ts`. Studio desk:
`src/sanity/structure.ts`. The list is sorted by newest `_updatedAt` by
default; filters (race, opponent, difficulty, search) live in the query
string and the page's canonical URL stays `/learn/builds`.

## The starting library

The first 32 builds were transcribed from the build-order cards inside the
WordPress guides (8 Orc, 11 Undead, 6 Human, 7 Night Elf). The data is in
`scripts/builds/<race>.mjs` as `[supply, icon, instruction, time?]` rows plus
metadata, and `scripts/builds/to-ndjson.mjs <race>` turns a file into NDJSON
for `sanity dataset import`. Each document has a deterministic
`build-<slug>` id and a `guide` reference, so fixing a transcription means
editing the `.mjs` file and re-importing with `--replace` (or editing in the
Studio, if the fix should not be overwritten by a later import).

## Icons

Step icons are the classic (pre-Reforged) command-button art, sourced from the
W3Champions launcher (`github.com/w3champions/launcher`,
`src/assets/images/hotkeys/icons/classic/`) as 64px WebP in
`public/wc3-icons/<key>.webp`. As in the game data, Ancient Protector uses
`BTNTreant` and Goblin Laboratory uses `BTNAmmoDump`.

The manifest is `src/lib/builds/icons.ts`: it defines every key, title, race
and kind, and feeds both the Studio dropdown and the site. To add an icon,
add a manifest entry and drop the matching `<key>.webp` in the folder. If an
image is missing the UI shows a lettered chip instead of breaking.

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` | read access (already set for the blog) |
| `SANITY_API_WRITE_TOKEN` | **Editor**-scoped token from sanity.io/manage → API → Tokens. Server-only. Without it the submit form reports that submissions are unavailable. |

Set the token locally in `.env.local` and in the Vercel project for
Production (and Preview if you want previews to accept submissions).

## JSON API

Public, read-only endpoints so a desktop overlay (or any other client) can
consume the same build orders shown on the site. No auth — the data is
already public; only approved builds are ever served, same as the pages.

| Endpoint | Returns |
|---|---|
| `GET /api/builds` | `200 { "builds": ApiBuild[] }`, in the order `getBuilds()` returns. List items **omit `description`**. |
| `GET /api/builds/<slug>` | `200 { "build": ApiBuild }` including `description`, or `404 { "error": "not_found" }` when the slug doesn't match an approved build. |
| `OPTIONS /api/builds`, `OPTIONS /api/builds/<slug>` | `204`, no body, CORS headers only (preflight). |

`ApiBuild` is every field of `BuildOrder` (see Content model above; the
opponent list is `vsRaces`, empty for any) except
that each item in `steps[]` also gets `iconUrl`: an absolute URL
(`<request origin>/wc3-icons/<icon>.webp`), added only when the step has an
`icon`. The `icon` key itself is kept unchanged. There is no `reviewStatus`
field in the API — the data layer already serves approved-only, so it would
be redundant and it is never exposed.

Every response, including `404` and `OPTIONS`, carries:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

(`404` responses use a shorter `s-maxage=60` so a miss doesn't linger in a
shared cache.) The open CORS policy is deliberate: the data is already
public on the site, and the overlay runs on a different origin.

The Sanity webhook (`/api/revalidate`, above) also purges `/api/builds` and
`/api/builds/<slug>` when a `buildOrder` changes, so the API reflects an
edit as fast as the pages do.

## Code map

| Path | What |
|---|---|
| `src/lib/builds/types.ts` | `BuildOrder`, `BuildStep`, clock helpers |
| `src/lib/builds/builds.ts` | `getBuilds`, `getBuildBySlug`, `getBuildsForGuide`, `filterBuilds`, `getFeaturedBuild`, Sanity with fixture fallback |
| `src/lib/builds/fixtures.ts` | four made-up seed builds, **development only**, used when Sanity is unreachable or empty. Never served in production. |
| `src/lib/builds/icons.ts` | the icon manifest (keys, titles, race, kind) |
| `src/lib/builds/submission.ts` | zod schema shared by the form and the action |
| `src/lib/builds/submit.ts` | write client; creates the draft |
| `src/lib/builds/serialize.ts` | `BuildOrder` → `ApiBuild`/`ApiBuildListItem` DTOs for the JSON API |
| `src/app/(site)/learn/builds/` | list, `[slug]` detail, `submit` (page + server action) |
| `src/app/api/builds/` | public JSON API: `route.ts` (list), `[slug]/route.ts` (detail), `_headers.ts` (shared CORS/cache headers) |
| `src/components/builds/` | `StepTable` (timer), `MatchupPicker`, `RaceCrestPicker` (single and multi-select crests), `BuildRow` + `FeaturedBuild`, `BuildSubmitForm`, `IconPicker`, `GameIcon`, `OverlayBeta` (pointer to the overlay page), badges |
| `scripts/builds/` | transcribed build data per race and the NDJSON converter |

## Not in this version

- Votes / Trending (kept out deliberately; revisit once the site has login)
- Editing a published build from the site (editors do it in the Studio)
- Comments
