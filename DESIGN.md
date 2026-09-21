# Data Display Rules

This file states how the site shows league data: figures, results, races, bars and charts. The look of the site (black ground, gold accent, Cinzel display type) lives in `src/app/globals.css` and is not changed here. If this file and the code disagree, the code wins and this file is fixed.

The rules come from the WC3 Gym app, which shows the same league data to the same players: [`DESIGN.md` in wc3-gym-frontend](https://github.com/Warcraft-Gym/wc3-gym-frontend/blob/main/DESIGN.md). A reader who moves between the two sites must find one way to read a record, a result and a race. The two sites keep their own look. The section "Shared with the app" lists what is the same and what differs.

## Before you draw data

- An agent loads the `dataviz` skill and the `frontend-design` skill before it writes a chart, a bar, a stat tile or a table of figures.
- Choose the form from the question the reader has. Choose the colour last.
- Look in "Where the pieces live" first. Reuse a piece before you draw a new one.
- Test every new mark colour with the validator of the `dataviz` skill, on the black ground: `node validate_palette.js "<hex,hex>" --mode dark --surface "#000000" --pairs all`. Do not judge a colour pair by eye.

## Where the pieces live

| Piece | File |
|---|---|
| Colour tokens | `src/app/globals.css` |
| `record()`, `rate()`, `signed()`, `resultLabel()` | `src/lib/figures.mjs`, tested by `src/lib/figures.test.mjs` |
| `mainRace()` | `src/lib/races.mjs`, tested by `src/lib/races.test.mjs` |
| `vsRaceOfSeason()`, the ladder season split | `src/lib/w3c-vs-race.mjs`, tested by `src/lib/w3c-vs-race.test.mjs` |
| Race names and icon paths | `RACES` in `src/lib/utils.ts` |
| Ladder band: the race rows and the MMR chart | `src/components/league/MmrChart.tsx` |
| Race MMR chips | `src/components/league/RaceMmrChips.tsx` |
| Meter (one bar with a figure) | `src/components/ui/Meter.tsx` |

`pnpm test` runs the three test files with the test runner of Node.

## Figures

- A record reads `{wins} – {losses}`, with an en dash and one space on each side. From ten played it carries the percent: "19 – 11 (63%)". Under ten it stands alone: "3 – 1". Nothing played prints an em dash. `record()` writes every record on the site.
- Never write a record as "19/30", "19W 11L", "19-11" or "19W - 11L". A team record in a league with draws always prints three parts in the order wins, draws, losses: "6 – 1 – 3", and "12 – 0 – 8" with no draws. It carries no percent.
- One percent per record. A record that carries its percent has no "Win rate" tile or column beside it.
- A figure names what it counts. A series is a best of three. A game is one game, on the ladder or inside a series. A fixture is one week of one team against another, and holds several series. Never use one word for another. A tile label reads "Series record" or "Ladder games", never "Record".
- A record never stands without its unit word, close enough that a crop of the figure still carries it: "Series 1 – 2", "Games 11 – 5 (69%)", "Ladder games 234 – 298 (44%)". A column of records names its unit once, in the head above the column.
- The backend counts series in the fields it calls games: `gnl_stats.games`, `gnl_stats.wins` and `gnl_stats.losses` are played, won and lost best-of-three series, and `gnl_stats.matchup_history` holds one opponent race per series. Only the `Raw*` types keep those names; the site's own types read `seriesPlayed`, `seriesWon` and `seriesLost`.
- A team's W, D and L count weekly fixtures, from `mapStandings()`, not the series inside them.
- A figure names its scope: this season, all GNL seasons, or a W3Champions ladder season. A ladder figure stands beside the W3Champions mark.
- A ladder count always names its W3Champions season, as "Ladder games · S25". The league stores ladder games from season 23 only, so the site prints no all-time ladder total. With no season the tile shows an em dash.
- Name the Gym Newbie League in full, or as GNL where the label style is short. Never call it "the league": a league is the general term, and GNL and KOTH are both leagues. The navigation item "League" is the route to the GNL pages and keeps its name.
- A score is not a record. A series score keeps its colon, "2 : 1", and a points pair is written by hand with no percent.
- Every figure that sits in a column uses tabular numerals (`.tnum`). Numbers align right in a table.

## Results

- `win` and `loss` are the only result colours. A draw, an unplayed series and a neutral amount use a text token.
- A result seen from one side, such as a player page or a team page, puts that side's score first and draws the score in `win` or `loss`. The order of the score is the second channel beside the colour. The `title` and the `aria-label` read "Won 2 : 1" or "Lost 1 : 2", from `resultLabel()`.
- A result seen from no side, such as the schedule or a fixture card, draws the winner's score in `gold` and the other score in a quiet text token. It uses no `win` and no `loss`, because no reader is the subject.
- A loss never wears a warning icon and never the words "You lost". An alert icon is for a fault or a call to action.
- A rate is not a result. A win rate prints in a text token at every value. It does not turn `win` above 50% and `loss` under it.
- A signed change keeps its sign: "+24", "−18". The sign is the second channel beside the colour.
- Form pips keep the letter W, D or L inside the pip.

## Races

A player is not one race. The league data holds four different race facts, and each surface names the one it shows.

| Race fact | Source | Where it shows |
|---|---|---|
| Ladder races | `w3c_stats`: one row per race per W3Champions season, with MMR, games, wins and losses | `PlayerProfile.w3c` and the live ladder rows of the player page: the race MMR chips and the ladder band, whose race rows select the line of the MMR chart |
| Signup race | `signup_race`: the race of one player in one season. A player may sign up with another race next season. | `Player.race` and `Player.mmr`: the race badge and the MMR of a roster row, always beside their season |
| Played race | The race a player picked in one series | The series row, beside that series only |
| Profile race | `race`: one value per player, a legacy field of the backend | Nowhere. This site does not read it. |

- No surface treats a race as a fixed property of a player. A race always belongs to a ladder season, a league season or a series.
- A season row with no signup race carries no race: it shows no badge and no icon, and it stands outside the race make-up bar of its team and the count beside it.
- The player page holds every ladder race with games in the newest W3Champions season that has rows, sorted by MMR from high to low. A roster row holds one race and one MMR, both of the signup race of its season. No surface prints an MMR without the race it belongs to, with one exception: an MMR typed in by hand for a player with no ladder rows.
- The main race is a display choice, not a data fact. `mainRace()` picks the race with the highest MMR among ladder races with ten or more games, and answers nothing when no race reaches ten games.
- The main race selects the masthead art and the large icon of the player page, the bold race chip and the first selected line of the MMR chart. It never hides another race.
- With no main race the player page is neutral: the shared scene as masthead art, no large race icon, no bold chip. It never picks a scene at random, because a race scene states a race.
- The player page shows one chip per ladder race: icon, MMR and the record. The record is printed, not hidden in a tooltip, so touch and keyboard readers get it too. The headline MMR tile is the first ladder row, the highest MMR, and names its race: "W3C MMR · Orc".
- The MMR chart draws one line per ladder race on one MMR axis. See "The MMR chart".
- A race is an icon first. Every race mark carries the race icon with its name as `alt` and `title`. A race name in text wears a text token, never the race colour.
- A race colour fills a mark with no text on it: a bar segment, a dot, a stripe. Race colours and result colours never encode data in the same mark set, because orc red sits close to `loss`.
- The Random race uses the neutral `random` token.

## Colour tokens for data

The maintainers decided on 20 September 2026 that this site takes the data colours of the WC3 Gym app: for data, the app's palette is the reference, and this site uses its dark values, which pass on the black ground. Values are tested on the black ground with the validator. A pair passes from ΔE 8 for a colour-blind reader and from ΔE 15 for full colour vision.

| Token | Value | Job | Tested |
|---|---|---|---|
| `--wg-win` | `#4F95D8` | A won series, game or bar | With `loss`: ΔE 19.3 colour blind, 25.8 full vision |
| `--wg-loss` | `#DE6E52` | A lost series, game or bar | |
| `--wg-human` | `#02809C` | Race mark | The four race colours as a set: ΔE 9.2 colour blind, 19.9 full vision |
| `--wg-orc` | `#BA4C4B` | Race mark | |
| `--wg-nightelf` | `#44AB46` | Race mark | |
| `--wg-undead` | `#9B6FE4` | Race mark | |
| `--wg-random` | unchanged | Race mark, neutral | Not a hue, so it is not in the set |
| `--wg-gold` | unchanged | The brand accent, the winner in a neutral result, the selected line of a chart | With `win` and `loss`: ΔE 14.2 colour blind |
| `--wg-live` | unchanged | A live series. It always ships with its dot and the word "Live". | A status colour, never a chart series |

- Win is blue, not green. A reader with red-green colour blindness cannot rely on green against red, and blue against a warm red holds for every reader. The app made the same choice, and both sites mean the same thing by blue.
- Text never wears a data colour, with two exceptions where the text is the mark: a result score or a signed change, and a count under a W or L column title.
- Gold is the brand. Gold never means "won" on a page that has a subject.

## Charts, bars and tiles

- One plot has one y-axis. Two measures on two scales go in two plots.
- A chart draws its scale: grid lines and tick labels in a text token at low emphasis. A reader must be able to read a value with no hover.
- Size an SVG in real pixels from its container. A fixed `viewBox` stretches the text on a wide card.
- Lines are 2 px. A dot has a 2 px ring in the ground colour. Stacked or adjacent bars leave a 2 px gap.
- Hover, touch and keyboard read the same values. A chart is one keyboard stop, and the arrow keys walk its points. Never rely on the `title` attribute alone, because it shows on neither touch nor keyboard focus.
- Every chart and bar has `role="img"` and an `aria-label` that states what it shows and its range. A plain `div` with an `aria-label` and no role is not read out.
- A legend holds only the marks that have no label of their own. Four series or fewer carry a direct label and need no legend box.
- A win rate never gets a bar. The record carries the percent, and a row of records reads as a column of figures. A meter shows an amount against a maximum, in one hue on a neutral track, with its figure beside it: team ladder points, the fantasy points breakdown. It is never `win` on a `loss` track.
- A stat tile holds one figure, its label and its scope. A row of tiles never holds two forms of one fact, such as a record and its win rate.
- An amount scale uses one hue from light to dark. A category uses the fixed race set or the result pair. Never add a colour to tell a fifth series apart. Use small multiples or select one line.

### The MMR chart

The chart is the right side of the "W3Champions ladder" band, one full-width band of the player page after the Gym Newbie League content and before "Recent ladder games" and "Heroes".

- The band holds the race rows on the left, about a third of the width, and the plot on the right, about two thirds and about 320 px tall. Under 900 px the rows stack above a full-width plot about 260 px tall.
- **The rows are the selector.** Each ladder race is one `<button>` with `aria-pressed`: icon, race name, league and rank, "Ladder games" record and MMR. There is no separate button row. The main race is selected first, and with no main race the first row, which holds the highest MMR.
- A race with fewer than two timeline points keeps its row, is not pressable, and says "Too few games for a line" in visible text, never in a `title`.
- Pointing at a row lights its line; pointing at a line lights its row. A quiet line rises to the full text colour at 2 px, and its gutter label with it.
- One line per ladder race, all on one linear MMR axis, with a tick every 100 MMR or every 200 MMR when the range is wide, and a date axis with the first and last day.
- The selected race draws in `gold` at full strength, last and on top, with its area fill and its end dot. Every other race draws as a quiet 1.5 px line in a text token.
- Every line carries a transparent 16 px hit path with `cursor: pointer`, so a click or a tap on the line selects that race.
- No dot on every point. Only the end dot of the selected line and the crosshair dot, each with a 2 px ring in the ground colour.
- Every line is labelled in a gutter at the right edge of the plot: its race icon and its end MMR, pushed at least 16 px apart, held inside the plot box, and joined to its end point by a faint leader when the line ends before the right edge. No icon sits among the lines.
- The readout is a fixed row above the plot, so it never covers the crosshair point and never leaves the card at any width. It names the date and every race's MMR on that date, the selected race first, bold, with its signed change since its first point. A race's value is its latest point on or before that date; a race with no point yet is left out.
- The plot is one keyboard stop. Left and Right walk the dates, Home and End jump to the ends, Up and Down change the selected race, Escape and blur clear the crosshair. The `aria-label` names the races, the selected race and the MMR range.

## Creep routes

A creep route page (`/learn/creep-routes/<slug>`) shows the minimap as SVG (`CreepMap`, `src/components/creep-routes/`) beside a step table you can play along with (`RouteStepTable`). The map and the table are two views of the same `CreepRoute`, and share one piece of state — the active stop — so pressing play in the table lights the same marker on the map.

- **Camp difficulty bands.** A camp's summed creep level sorts it into one of three bands, from `scripts/creep-maps/camps.mjs`'s `BAND_MAX_LEVEL`: **easy** at level 9 or under, **medium** at 10–15, **hard** at 16 or over. Chosen from the actual distribution of summed camp level across the eight catalogues (165 camps: min 5, p33 10, p50 14, p66 17, max 26) — easy stops at 9 because a level-1 hero can solo a camp that light, which is what players mean by a "green" camp; the previous 5/11 cutoffs put only 7 of 165 camps in "easy" and none at all on Autumn Leaves. The band is a mark, never text, same rule as a race colour: a filled circle on the map, a small dot (`BandDot`) beside the camp id in the table and in the hover panel.
- **Marks on the map.** A camp is a filled circle in its band colour, radius scaling modestly with the camp's level; every mark carries `data-camp="<id>"`. A start spot is a gold ring — solid for player 1, dashed for player 2 — labelled "P1"/"P2", `data-start`. A gold mine is a small gold diamond (a square rotated 45°), `data-mine`. Camp contents (creeps, their levels, whether they sleep) always come from the map catalogue, looked up by `campId` — never authored on the route, so a route can never invent what's in a camp.
- **The route path and stop numbers.** A route draws as a polyline through its camp stops in order, skipping `campId: null` stops (a TP-home, a shop visit — those show only in the table, never on the map). The line is `--wg-gold` with a `--wg-bg` under-stroke, so it reads over any terrain. Each camp stop gets a numbered gold badge, its number the stop's real 1-based position in `route.stops` — so a badge's number always matches the table row of the same colour, even when a non-camp stop sits between two camps and the map skips it. The active stop's marker enlarges and gets a soft pulsing ring; motion is compositor-only (`transform`/`opacity`) and respects `prefers-reduced-motion`.
- **The day clock and the real clock.** Every time in a route shows both: the in-game day clock (`toDayClock`, e.g. "16:30") and the real "m:ss" clock counting up from the start of the route. Night (18:00–05:59 game time) gets a small moon glyph with a real `title`/`aria-label`, never a colour alone.
- **"Bring" icons.** The step table's Bring column shows the units the *player* brings to a stop (`GameIcon` × count) — this is never the camp's contents, which are the map's, not the route's.
- **The computed hero level.** `deriveRoute` (`src/lib/creep-routes/derive.mjs`) runs a hero through the route's camp stops in xp order and reports the level/xp after each stop ("Lv 2 · 312 xp"); this is derived, never authored, so it can never drift from the camp data.
- **Keyboard and assistive tech.** The map SVG is one keyboard stop (`role="img"`, `aria-label` naming the map and its camp/stop counts); arrow keys walk the route's camp stops (or every camp, with no route), Escape clears, and an `aria-live` region names the current camp for anyone not hovering it. The step table is a real `<table>` and is the map's fallback for assistive tech — it needs no separate accessible view.

### List

`/learn/creep-routes` (`RouteRow`, `src/components/creep-routes/`) copies `BuildRow`'s grid, so the two list pages read as one family: race crest · title + summary + meta line · a right-hand column with the level badge and a time line, same breakpoints, same `panel` treatment, same left-edge accent bar (by `level` here — `standard` gold, `beginner` win-green — where `BuildRow` keys the same accent off `difficulty`).

- **Row anatomy.** Crest (`/factions/large/<race>.webp`) · title + one-line summary · a meta line reading `vs <opponent icons>` (`VsRaces`, shared with builds) · map name (+ `v<mapVersion>` when known) · stop count · author, e.g. "Autumn Leaves v2 · 4 stops · by Gym coaches". The right column stacks the route's `LevelBadge` over a `tnum` line: the updated date and, when the route has a first stop, "starts `<day clock>`" (`toDayClock` of `stops[0].time`) — the same day-clock convention as the detail page, so a route's starting time of day is visible without opening it.
- **Unit words.** Always the plural noun after the count, lower case, no abbreviation: "4 stops", "1 route" / "5 routes" (the result count in the filter bar), never "4 camps" (a route's stop count, not the map's camp count — those differ when a stop is a TP-home or shop visit).
- **Filters live in the URL**, `?race=&vs=&map=&level=&q=&sort=`, applied with `router.replace(..., { scroll: false })` so the list is shareable and back/forward-safe; every control applies on change except the search box, debounced 300 ms — the same pattern as `/learn/builds`' `MatchupPicker`. `RouteFilters` (`src/components/creep-routes/RouteFilters.tsx`) is a sibling of `MatchupPicker`, not a reuse of it: a build's `difficulty` (beginner/intermediate/advanced) and a route's `level` (standard/beginner) are different vocabularies, and the map select has no build-list equivalent.
- **No map thumbnail on the row.** `CreepMap` was considered per-row at ~120px (its `highlightCamps` prop exists for exactly this), but at that size on a narrow phone width the row either clips the crest/meta column or grows tall enough to break the list's scan rhythm; skipped for this feature. The full map lives on the detail page.

### New colour tokens

| Token | Value | Job | Tested |
|---|---|---|---|
| `--wg-camp-easy` | `#6BE0C8` | Easy camp mark (level <= 9) | Against `#000000`: 13.12:1. Pairwise vs medium 1.72:1, vs hard 3.42:1 |
| `--wg-camp-medium` | `#E0863A` | Medium camp mark (level 10-15) | Against `#000000`: 7.64:1. Pairwise vs hard 1.99:1 |
| `--wg-camp-hard` | `#C23050` | Hard camp mark (level >= 16) | Against `#000000`: 3.83:1 |

The `dataviz` skill's `validate_palette.js` was not present on disk for this feature (see the F003 handoff); the three values above were checked instead with a small WCAG contrast script (`(L1+0.05)/(L2+0.05)` relative luminance) against a >= 3:1 floor on black for each mark and a >= 1.5:1 pairwise floor between bands, so the three read as visually distinct marks over any terrain.

## Data flow

- The page reads per-race rows once and passes them down. A component never fetches its own copy.
- The W3Champions API serves the race rows and one MMR timeline per race. The timelines of all ladder races load in parallel on the server, with the 10 minute cache window of `src/lib/w3c.ts`. That is up to five small reads per player page per window, and none of them touch the league backend. The timelines of five races add about 5 KB to the page payload.
- The per-race split of the ladder panel is the whole season, from one `player-stats/{tag}/race-on-map-versus-race?season={n}` read of about 49 KB, in the same window and behind the same never-throw wrapper. `vsRaceOfSeason()` keeps the one row the page needs: every race the player picked, over the map "Overall". The 100 match read stays for "Recent ladder games" and the heroes, and never feeds the split. When the season read fails the panel shows its headline record and no per-race rows, because a 100 game sample and a season are different figures.
- League reads keep their 60 second window. A new data mark never adds a league read per row. Ask for one aggregated read instead.

## Shared with the app

| Rule | The app | This site |
|---|---|---|
| Record format, series and game words, scope | `figures.mjs` | The same rule, in `src/lib/figures.mjs` |
| Win is blue, loss is warm red | `win`, `loss` | The same values as the app's dark theme |
| A player has many races; a race is an icon first | Race MMR chips | The same, plus a main race for the masthead art |
| Own score first, no alert icon for a loss | Yes | Yes |
| One y-axis, drawn scale, 2 px lines, legend rule | Yes | Yes |
| Look | Stone and bronze, light and dark, Alegreya | Black and gold, dark only, Cinzel |
| Neutral result | Not used | Gold for the winner on the schedule |
| Chart maths | d3 scale and shape modules | Plain functions today. Add `d3-scale` and `d3-shape` when a second chart needs them. |

## Open questions

- `--wg-arcane`, the blue of the cast and VOD chips, sits near `win`. It is a control colour and never a mark, so the two do not meet in one mark set. A later pass can move it.

## Known gaps

- The ladder page shows one race per player, the `race` of each row of the ladder read. The backend fills that field from its legacy profile race, so this page is not decoupled yet. The fix is in the backend: the ladder read sends the signup race of the season.
- The games-per-day bars of the ladder page draw no y-axis and have no keyboard route.
- `--wg-line` at 18% is under the 3:1 floor for a line that separates figures.
- The smallest figure labels run under 10 px.
