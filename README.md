# Warcraft 3 Gym — Web

A modern public site + player dashboard for the **Gym Newbie League (GNL)**,
built to replace the WordPress site and deploy on **Vercel**.

- **Framework:** Next.js 16 (App Router, React 19, TypeScript, Turbopack)
- **Styling:** Tailwind CSS v4 — custom "War Room" design system (dark
  esports-editorial: obsidian, engraved gold, arcane teal, race-faction color)
- **League data:** consumes the existing [Flask backend](https://github.com/Warcraft-Gym/backend)
  (MySQL, JWT) server-side — the service token never reaches the browser
- **Blog:** [Sanity](https://www.sanity.io/) behind a swappable content interface
- **Fallback:** runs entirely on realistic fixtures when no backend/CMS is
  configured, so local dev and previews work out of the box

## Getting started

```bash
pnpm install
cp .env.example .env.local   # optional — the site runs on fixtures without it
pnpm dev                     # http://localhost:3000
```

`pnpm build` for a production build, `pnpm start` to serve it.

## Architecture

```
Vercel (this app, Next.js)
├─ Public site      /, /standings, /schedule, /brackets, /teams, /players
├─ Blog             /blog  ── Sanity (or fixtures)
└─ Player dashboard /dashboard  (placeholder — next milestone)
        │
        │  server-side fetch (JWT held server-side only)
        ▼
Flask API (existing)  ──  MySQL  (teams · matches · series · fantasy · auth)
```

### The data seam

All league reads go through `src/lib/api/gnl.ts`. Each function tries the live
Flask API and **falls back to fixtures** on any error or when unconfigured. When
the backend's exact JSON is confirmed, adjust the `live()` mappers there — the
UI never changes. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Environment

| Variable | Purpose |
| --- | --- |
| `GNL_API_BASE_URL` | Flask API base URL. Empty → fixtures. |
| `GNL_SERVICE_TOKEN` | Read-scoped JWT, server-side only. |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Enables the live blog. Empty → fixture posts. |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset (default `production`). |

## Project structure

```
src/
├── app/                  # routes (App Router)
│   ├── page.tsx          # home
│   ├── standings/ schedule/ brackets/ teams/ players/ blog/ dashboard/ …
├── components/
│   ├── ui/               # Button, Surface, Badge, Container, PageHeader
│   ├── layout/           # header, footer, nav, wordmark
│   ├── league/           # StandingsTable, SeriesCard, TeamCard, BracketView
│   ├── home/             # Hero
│   └── blog/             # PostCard, PostBody
├── lib/
│   ├── api/              # Flask client, domain types, fixtures, gnl.ts (seam)
│   ├── content/          # blog: Sanity + fixtures behind one interface
│   └── utils.ts          # cn(), race helpers, formatting
└── app/globals.css       # design tokens + base
```

## Blog / CMS

Editorial content is decoupled from league data. To stand up authoring for
admins, follow [`docs/blog-cms.md`](docs/blog-cms.md) — it includes the exact
Sanity schema and the one-time setup. Until then, the blog renders sample posts.

## Roadmap

- **✅ Milestone 1 — Public site** (this): home, standings, schedule, brackets,
  teams, players, blog.
- **Milestone 2 — Player dashboard:** Discord-token auth (the backend already
  issues one-time tokens), availability, self-scheduling, result reporting,
  fantasy.
- **Milestone 3 — Admin:** fold the current Vue admin into a role-gated section.

## Deploy

Push to a Vercel project (framework auto-detected as Next.js). Set the env vars
above in the Vercel dashboard. Preview deployments work on fixtures with no
secrets configured.

---

Community project. Not affiliated with Blizzard Entertainment.
