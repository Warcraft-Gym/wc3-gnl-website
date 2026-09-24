# Architecture

## Why this shape

The FastAPI backend owns the league domain: leagues, events, teams, fixtures,
series, player statistics and fantasy. This Next.js app is the public content
face. It keeps a small adaptation layer between the backend payloads and the UI
domain types, so page components do not depend on database-shaped field names.

This document covers that GNL/FastAPI data flow specifically. The site's
other data sources — Sanity-backed guides, build orders, and creep
routes/maps (each with a bundled-fixture fallback and a public JSON API) —
are documented in [`docs/content.md`](content.md),
[`docs/build-orders.md`](build-orders.md) and
[`docs/creep-routes.md`](creep-routes.md); see also the README's own
"Architecture" section for the one-page overview of every source.

## Data flow

Next.js Server Components fetch league data server-side. If
`GNL_SERVICE_TOKEN` is configured, the client attaches it as a bearer header in
the server runtime only.

```text
Server Component  →  src/lib/api/gnl.ts  →  src/lib/api/client.ts  →  FastAPI
                            │ (on any failure / unconfigured)
                            └─────────────→  src/lib/api/fixtures.ts
```

### `client.ts`

- `apiGet(path, { revalidate, query })` performs a typed GET with Next.js data
  caching and retries transient failures.
- `withFallback(live, fallback, label)` runs the live read and uses the bundled
  fixture on failure or when `GNL_API_BASE_URL` is unset.

### `gnl.ts`, the adaptation seam

Every GNL page starts from the same selection:

1. `GET /leagues` and select the row whose `kind` is `gnl`.
2. `GET /events?league_id={id}&published=true`.
3. Keep events whose common event phase is `finished`.
4. Select the season asked for, else the newest by `start_date`, with the id
   as the fallback order.

Step 3 is a choice for the current phase, not a rule. A running season could be
shown the same way, and the intended end state is a landing page that switches
on the season's phase: signups open, commenced, or complete. That switch is
deferred until it is the focus.

**Past seasons.** Every loader takes an optional season number and every
league page reads it from `?season=N` (`src/lib/api/season-params.ts`). The
default link, with no param, always shows the newest season, so the sub-nav
pill, the `SeasonLink` component and the schedule redirect only add the param
when browsing an older one. Pages 404 on a number that names no published
season. Team pages resolve their slug across all seasons and offer a switcher
for the seasons the team played; player pages always show every season the
player took part in.

The selected event scopes every public table:

| Data | Backend read | Mapping |
| --- | --- | --- |
| season header and weeks | selected event | `mapSeason`, `deriveWeeks` |
| teams and rosters | `GET /events/{event_id}/teams` | `mapTeams`, `flattenPlayers` |
| schedule and results | `GET /events/{event_id}/series` | `mapFixtures` |
| standings | event teams plus event series | `mapStandings` |
| player pages | roster entry, `gnl_stats`, `w3c_stats`, `/stats/career`, series, across every published event | `mapPlayerProfile` |
| team pages | teams and series of the chosen season, across every published event for the switcher | `getTeamPage` |
| season ladder | `GET /events/{event_id}/ladder` | `mapLadder` |
| fantasy table | `GET /events/{event_id}/fantasy/teams` | `mapFantasy` |

Team images use the `icon_url` carried by the backend response. That URL points
straight at the backend's public blob store. When an older payload has no URL,
the mapper falls back to the league-scoped image redirect.

## Backend read cost

Every `apiGet` that misses the Next.js data cache is one backend call, and the
backend reads the database for it. The cost is the rows one call reads times
the number of misses. Page views do not add to it while the cache holds.

- **The data cache.** `next.revalidate` holds each URL's answer for that many
  seconds, shared by every instance. It applies on `force-dynamic` pages too,
  because the fetch sets `revalidate` itself. The default is
  `DEFAULT_REVALIDATE` in `client.ts`, 60 seconds. After expiry the next view
  gets the stale copy and one call refreshes it in the background.
- **The backend's edge cache.** The backend marks some open reads as cacheable
  at the Vercel edge. The edge never serves a request that carries an
  Authorization header, so with `GNL_SERVICE_TOKEN` set, a miss here also
  misses the edge.
- **Separate requests.** The Open Graph image routes fetch again for the same
  page. They share only the data cache, not the page render's fetches.

Rows per call, measured on the seeded database:

| Read | Rows per call | Called |
| --- | --- | --- |
| `GET /events/{event_id}/series` | the whole season, 117 to 533 series | once per season shown; the player page once per season the player played |
| `GET /stats/career` | up to 500, the first page | once per player page, for one row |
| `GET /events/{event_id}/teams` | every roster of the season | once per season shown |
| `GET /leagues`, `GET /events` | a few | once per render |

Rules for a new or changed read:

- Set `revalidate` by how often the data changes. A finished season changes
  only when an admin corrects it, so it can be held for hours.
- Read the narrowest route the page needs. `GET /stats/career/{user_id}`
  answers one player. When no narrow route exists, ask the backend for one
  instead of filtering a season-wide list here.
- A list route answers at most 500 rows by default. Read `X-Total-Count` and
  page with `offset` when a list can be longer.
- Local development points `GNL_API_BASE_URL` at a local backend. A hard reload
  in `next dev` skips the data cache and calls the backend again.
- A result reported on the backend shows here after at most `revalidate`
  seconds, plus the backend's edge cache time for that route.

The UI consumes only the types in `src/lib/api/types.ts`. Backend-specific
names such as `season_id`, `playday` and `player_by_season` stop in the mapper.

## Player dashboard

The public site is read-only today. The dashboard milestone can build on the
backend's member routes for availability, scheduling, result reporting and
fantasy without moving those rules into Next.js.
