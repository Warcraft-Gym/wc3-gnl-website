# Architecture

## Why this shape

The Warcraft-Gym org already has an **actively developed** Flask + MySQL backend
(`backend`) and a Vue admin (`admin_frontend`). The backend models the league
domain: users, teams, matches, series, and fantasy. WordPress was only the
public content face.

So this app does **not** rewrite the backend. It is a new Vercel-hosted Next.js
frontend that:

1. serves the modern **public site** (replacing WordPress),
2. adds the missing **player dashboard** (next milestone), and
3. consumes the existing Flask API for league data.

This respects the community's backend investment and keeps Python contributors
on their stack.

## Data flow

Next.js Server Components fetch league data server-side. The Flask service token
is read from `GNL_SERVICE_TOKEN` and attached as a `Bearer` header inside the
server runtime only — it is never shipped to the browser.

```
Server Component  →  src/lib/api/gnl.ts  →  src/lib/api/client.ts  →  Flask API
                            │ (on any failure / unconfigured)
                            └─────────────→  src/lib/api/fixtures.ts
```

### `client.ts`

- `apiGet(path, { revalidate, query })` — typed GET with ISR caching
  (`next: { revalidate }`), throws `ApiError` on non-2xx or network failure.
- `withFallback(live, fallback, label)` — runs `live()`, and on any throw (or
  when `GNL_API_BASE_URL` is unset) resolves `fallback()` instead, tagging the
  result `source: "live" | "fixture"`.

### `gnl.ts` — the adaptation seam

Every public read (`getStandings`, `getSchedule`, `getTeams`, `getPlayers`,
`getBracket`, `getActiveSeason`) is a `withFallback` pairing a live mapper with a
fixture. The live mappers currently throw `"… mapping not yet wired"` so the site
runs on fixtures until the backend contract is verified end-to-end.

**To go live:** confirm the JSON shape of the relevant Flask endpoint (see the
backend blueprints below), implement the mapping from raw JSON → the domain
types in `src/lib/api/types.ts` inside the corresponding `live()` body, and
remove the throw. The UI consumes only the domain types, so nothing else changes.

## Known backend surface (from the repo)

Flask blueprints, global open CORS, JWT auth, Swagger at `/apidocs/`:

| Area | Blueprint | Notes |
| --- | --- | --- |
| Public/player | `public_api` | **Token-gated** player actions (signup, player-series, fantasy) via one-time Discord-bot tokens. This is the **dashboard** auth model. |
| Teams | `team_api` | Team + roster reads. |
| Matches / series | `match_api`, `series_api`, `draft_series_api` | Scheduling + results. |
| Seasons | `season_api` | Active season, season list. |
| Stats / scores | `stats_api`, `score_api` | Standings inputs. |
| Fantasy | `fantasy_api` | Fantasy teams + bets. |
| Auth / users | `login_api`, `user_api`, `signup_api` | JWT + accounts. |
| Other | `map_api`, `koth_api`, `config_api`, `import_export_api` | Maps, KotH mode, config, import/export. |

### Recommended backend ask

The public read endpoints (`team`, `series`, `season`, `stats`) are currently
JWT-protected. Two clean options:

1. **Short term:** issue a read-scoped service JWT for the site to use
   server-side (works today).
2. **Better:** add read-only public endpoints (e.g. `/public/standings`,
   `/public/schedule`) so the public site never needs an admin-scoped token.
   File this against the backend repo.

## Player dashboard (milestone 2)

The backend's `public_api` already implements the exact flow the dashboard
needs: a Discord bot creates a one-time access token (`/public-access-helper`),
the player exchanges it (`/public-token/<token>`, `/user-info`), then reads and
updates their own series (`/player-series`) and fantasy (`/fantasy-*`). The
dashboard is a UI over these endpoints plus a session layer — no new backend
work required to start.
