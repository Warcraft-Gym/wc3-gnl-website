# Warcraft 3 Gym

The website of the Warcraft 3 Gym community at **https://warcraft3.gym**:
free Warcraft III guides and build orders for every race, the community, and
the **Gym Newbie League (GNL)**. It replaces the WordPress site and deploys
on **Vercel**.

- **Framework:** Next.js 16 (App Router, React 19, TypeScript, Turbopack)
- **Styling:** Tailwind CSS v4 with a Blizzard-style design system in
  `src/app/globals.css` (Cinzel display type, gold accents, painted key art,
  riveted section dividers)
- **Content:** [Sanity](https://www.sanity.io/) for guides, build orders and
  news, with the Studio embedded at `/studio`
- **League data:** the [FastAPI backend](https://github.com/Warcraft-Gym/wc3-gym-backend),
  read server-side; an optional service token never reaches the browser
- **Fallback:** every data source falls back to bundled fixtures, so local
  dev and preview deployments work with no secrets configured
- **Desktop overlay:** `apps/overlay`, a Tauri app that floats a build order
  over the game (see below)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # optional, the site runs on fixtures without it
pnpm dev                     # http://localhost:3000
```

`pnpm build` for a production build, `pnpm start` to serve it, `pnpm lint`
for ESLint.

## What is on the site

| Route | What | Source |
| --- | --- | --- |
| `/` | Homepage: learn by race, build orders, community, news, the GNL | all of the below |
| `/learn`, `/learn/<category>` | Guide hubs per race and topic; the new-players hub renders the full handbook | Sanity `guide` |
| `/learn/guide/<slug>` | A guide, with its play-along build order when one was transcribed from it | Sanity `guide` + `buildOrder` |
| `/learn/builds`, `/learn/builds/<slug>` | Build orders with filters, a step table and a play-along clock | Sanity `buildOrder` |
| `/learn/builds/submit` | Public submission form, fillable from a replay, a W3Champions match or the overlay's export; submissions land in the Studio as pending drafts | server action, write token |
| `/blog`, `/blog/<slug>` | News | Sanity `post` |
| `/gnl/*` | Schedule, standings, teams, players, ladder, fantasy, rules, about | FastAPI |
| `/about` | About the Gym | code |
| `/tools`, `/tools/overlay` | Community tools (editor-managed) and the Gym's overlay | Sanity `tool` + code |
| `/api/builds`, `/api/builds/<slug>` | Public JSON API for the overlay and anyone else | Sanity |
| `/api/replay-import` | Turns a `.w3g` replay or a W3Champions match into build drafts for the submit form | overlay's parser, server-side |
| `/studio` | Sanity Studio for editors | Sanity |

The Player Dashboard button links to the separate dashboard app
(`https://wc3-gym-frontend.vercel.app`, `DASHBOARD_URL` in `src/lib/links.ts`).

## Architecture

```text
Vercel (this app, Next.js)
├─ Learn, builds, news   ──  Sanity (Studio embedded at /studio)
├─ GNL pages             ──  FastAPI backend (server-side, optional bearer)
├─ /api/builds           ──  public JSON for the desktop overlay
└─ Fixtures              ──  used whenever a source is unconfigured or fails
```

- **League data seam:** every GNL read goes through `src/lib/api/gnl.ts`,
  which maps backend payloads onto UI types and falls back to fixtures. See
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- **Content:** guides, build orders and posts are read through
  `src/lib/learn`, `src/lib/builds` and `src/lib/content`, each with a fixture
  fallback. Pages use ISR (5 minutes) plus an on-demand revalidation webhook.
  See [`docs/content.md`](docs/content.md).
- **Build orders:** submission flow, review in the Studio, the icon set, the
  JSON API and the transcription scripts. See
  [`docs/build-orders.md`](docs/build-orders.md).
- **SEO:** `src/lib/site.ts` is the canonical origin; `robots.ts`,
  `sitemap.ts`, per-page canonicals, OpenGraph/Twitter images and JSON-LD
  (`Organization`, `WebSite`, `Article`, `HowTo`, `BreadcrumbList`) live in
  `src/app` and `src/lib/seo.ts`.
- **Feature flags:** `src/lib/flags.ts`. `OVERLAY_BETA_LIVE` gates every
  overlay surface on the site until the app has been tested.

### Environment

| Variable | Purpose |
| --- | --- |
| `GNL_API_BASE_URL` | FastAPI base URL. Empty means fixtures. |
| `GNL_SERVICE_TOKEN` | Read-scoped JWT, server-side only. |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` | Sanity read access. Defaults are baked in so the Studio always loads. |
| `SANITY_API_WRITE_TOKEN` | Editor-scoped token, server-only; lets the submit form create drafts. |
| `SANITY_REVALIDATE_SECRET` | Shared secret for the Sanity webhook that hits `/api/revalidate`. |
| `NEXT_PUBLIC_SITE_URL` | Override for the canonical origin (staging). Production defaults to `https://warcraft3.gym`. |

## Project structure

```text
src/
├── app/
│   ├── (site)/            # public routes: learn, blog, gnl, about, tools
│   ├── api/               # builds JSON API, revalidate webhook
│   ├── studio/            # embedded Sanity Studio
│   ├── layout.tsx         # fonts, metadata defaults, sitewide JSON-LD
│   ├── robots.ts · sitemap.ts · manifest.ts · opengraph-image.jpg
│   └── globals.css        # design tokens, key-art and panel utilities
├── components/
│   ├── ui/                # Button, PageHeader, KeyArt, Container, badges
│   ├── layout/            # header, nav, footer, wordmark
│   ├── home/              # homepage sections
│   ├── learn/ builds/ blog/ league/   # per-area components
│   ├── sanity/            # Portable Text renderer
│   └── seo/               # JsonLd
├── lib/
│   ├── api/               # FastAPI client, mappers, fixtures, gnl.ts (seam)
│   ├── learn/ builds/ content/        # data access with fixture fallbacks
│   ├── site.ts · seo.ts · flags.ts · links.ts · tools.ts · overlay.ts
│   └── discord.ts         # live member counts from the invite API
└── sanity/                # schema types, desk structure, env, image builder
scripts/                   # WordPress migrations and build-order transcription
apps/overlay/              # the desktop overlay (separate workspace package)
public/                    # key art, faction crests, classic WC3 icons, logos, country flags (flag-icons, MIT)
```

## Desktop overlay

`apps/overlay` is a separate pnpm workspace package: a Tauri v2 desktop app
that shows a build order in a transparent, always-on-top window while you
play, driven by `/api/builds`. It builds and lints independently of the Next
site. See [`docs/overlay.md`](docs/overlay.md) for install steps, shortcuts,
the release process and the manual checklist. Tagging `overlay-v<version>`
builds Windows and macOS installers on GitHub Actions and attaches them to a
Release; the site's `/tools/overlay` page reads the latest one. Releases are
signed and the app updates itself in-app once installed. Private builds
can be exported/imported as JSON and submitted to the site from the app — see
"Private builds" in [`docs/overlay.md`](docs/overlay.md). Build orders can
also be imported from a Warcraft III replay (`.w3g`) into a private build.

## Deploy

Push to the Vercel project (Next.js is auto-detected) and set the env vars
above. Preview deployments work on fixtures with no secrets configured. In
Vercel, set `warcraft3.gym` as the production domain with `www` redirecting
to the apex, and add the Sanity webhook described in
[`docs/build-orders.md`](docs/build-orders.md) so edits appear instantly.

---

Community project. Not affiliated with Blizzard Entertainment.
