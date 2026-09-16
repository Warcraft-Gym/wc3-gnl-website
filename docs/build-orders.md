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
3. Drafts never reach the site. In the Studio they appear under
   **Build orders → Pending review**. An editor opens the draft, edits if
   needed, and clicks **Publish** — or deletes it.
4. Published builds show up within five minutes (ISR revalidate 300).

Editors can also create builds directly in the Studio; same document type.

## Content model (`buildOrder`)

| Field | Notes |
|---|---|
| `title`, `slug` | slug is generated from the title on submission |
| `race`, `vsRace` | `human` · `orc` · `nightelf` · `undead`; `vsRace` may be `any` |
| `difficulty` | `beginner` · `intermediate` · `advanced` |
| `patch`, `tags`, `summary` | list metadata; summary is shown in the list |
| `author`, `authorDiscord`, `maintainer`, `sourceUrl` | credit |
| `featured` | **Build of the week** — spotlight at the top of the list. Turn it on for one build at a time. |
| `steps[]` | `{ time "mm:ss", supply, instruction, icon }` — `time` drives the play-along clock |
| `description` | Portable Text (same editor as guides) |

Schema: `src/sanity/schemaTypes/buildOrder.ts`. Studio desk:
`src/sanity/structure.ts`.

The list page's second spotlight is **Recently updated** (newest `_updatedAt`).

## Icons

Step icons are the game's command-button art, sourced from the W3Champions
community site (`github.com/w3champions/website`, `originalWC3Icons/`) and
resized to 64px WebP in `public/wc3-icons/<key>.webp`.

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

## Code map

| Path | What |
|---|---|
| `src/lib/builds/types.ts` | `BuildOrder`, `BuildStep`, clock helpers |
| `src/lib/builds/builds.ts` | `getBuilds`, `getBuildBySlug`, `filterBuilds`, `getFeaturedBuild` — Sanity with fixture fallback |
| `src/lib/builds/fixtures.ts` | four seed builds used when Sanity is unreachable / unconfigured |
| `src/lib/builds/submission.ts` | zod schema shared by the form and the action |
| `src/lib/builds/submit.ts` | write client; creates the draft |
| `src/app/(site)/learn/builds/` | list, `[slug]` detail, `submit` (page + server action) |
| `src/components/builds/` | `StepTable` (timer), `MatchupPicker`, `BuildRow`, `BuildSubmitForm`, `GameIcon`, badges |

## Not in this version

- Votes / Trending (kept out deliberately; revisit once the site has login)
- Editing a published build from the site (editors do it in the Studio)
- Comments
