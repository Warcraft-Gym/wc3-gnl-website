# Architecture

## Why this shape

The FastAPI backend owns the league domain: leagues, events, teams, fixtures,
series, player statistics and fantasy. This Next.js app is the public content
face. It keeps a small adaptation layer between the backend payloads and the UI
domain types, so page components do not depend on database-shaped field names.

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
4. Select the newest by `start_date`, with the id as the fallback order.

Step 3 is a choice for the current phase, not a rule. A running season could be
shown the same way, and the intended end state is a landing page that switches
on the season's phase: signups open, commenced, or complete. That switch is
deferred until it is the focus.

The selected event scopes every public table:

| Data | Backend read | Mapping |
| --- | --- | --- |
| season header and weeks | selected event | `mapSeason`, `deriveWeeks` |
| teams and rosters | `GET /events/{event_id}/teams` | `mapTeams`, `flattenPlayers` |
| schedule and results | `GET /events/{event_id}/series` | `mapFixtures` |
| standings | event teams plus event series | `mapStandings` |
| player pages | roster entry, `gnl_stats`, `w3c_stats`, `/stats/career`, event series | `mapPlayerProfile` |
| season ladder | `GET /events/{event_id}/ladder` | `mapLadder` |
| fantasy table | `GET /events/{event_id}/fantasy/teams` | `mapFantasy` |

Team images use the `icon_url` carried by the backend response. That URL points
straight at the backend's public blob store. When an older payload has no URL,
the mapper falls back to the league-scoped image redirect.

The UI consumes only the types in `src/lib/api/types.ts`. Backend-specific
names such as `season_id`, `playday` and `player_by_season` stop in the mapper.

## Player dashboard

The public site is read-only today. The dashboard milestone can build on the
backend's member routes for availability, scheduling, result reporting and
fantasy without moving those rules into Next.js.
