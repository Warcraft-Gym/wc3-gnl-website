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

A creep route page (`/learn/creep-routes/<slug>`) shows the minimap as SVG (`CreepMap`, `src/components/creep-routes/`) beside a step table (`RouteStepTable`) — an ordered list of camp stops, no time dimension (F007: routes have no timings). The map and the table are two views of the same `CreepRoute`, and share one piece of state — the selected stop, a sticky toggle — so **clicking** a row selects the same marker on the map, clicking a marker selects the same row, and Enter/Space on a focused row or marker does too, both ways (F009: before this, the read-only page's markers and rows were keyboard-walk-only — a mouse click on either silently did nothing). Hovering a row (mouse only) is a separate, lighter, row-local preview highlight; plain `Tab`-focus (keyboard) moves the browser's own focus ring but doesn't yet select. Neither is wired to the shared selection: a real mouse click always fires both a hover **and** a focus event just before the click itself (standard browser order), so if either drove the shared toggle, clicking an already-hovered/just-focused row would read as "deselect" instead of "select" — see `RouteStepTable`'s own doc comment for the reproduction.

- **Camp difficulty bands.** A camp's summed creep level sorts it into one of three bands, from `scripts/creep-maps/camps.mjs`'s `BAND_MAX_LEVEL`: **easy** at level 9 or under, **medium** at 10–19, **hard** at 20 or over. These match Liquipedia's own "Easy/Medium/Hard Creep Spot [N]" cutoffs (N = summed creep level), measured across six of their map previews (Hillsbrad Creek, Autumn Leaves, Echo Isles, Last Refuge, Turtle Rock, Twisted Meadows: easy 5–9, medium 10–19, hard 20–26) — a deliberate choice to match a resource players already read, not a re-derivation of our own percentiles (the previous cutoffs, easy <=9/medium <=15, were ours; the medium/hard line moved from 16 to 20). Across the nine catalogues' 183 camps: 55 easy, 102 medium, 26 hard. The band is a mark, never text, same rule as a race colour: a filled circle on the map, a small dot (`BandDot`) beside the camp label in the table and in the hover panel.
- **Marks on the map.** A camp is a filled circle in its band colour with a thin dark under-stroke and, outside that, a thin light halo ring (`rgba(255,255,255,.55)`) — Liquipedia's hard red is only ~3:1 against black on its own (see "New colour tokens" below), so the halo guarantees the mark reads over any terrain, light or dark; radius scales modestly with the camp's level; every mark carries `data-camp="<id>"`. A route is always drawn from *your* base: your own start is a red X (`--wg-loss`, `data-start="you"`), every other start is a small muted blue X (`--wg-win` at 60% opacity, `data-start="opponent"`) — wc3.no's convention, kept as a reference for harass/defend stops, ~15% larger than the original size as of F009 (still no "P0"/"P1" or any other text — a legend entry already names them). Which start is yours is `CreepRoute.start`, an index into `map.starts` (unset/0 for every two-start map; only Turtle Rock and Twisted Meadows, with four starts each, ever need it set to something else — the editor's "Your spawn" picker only shows on those). A gold mine is Liquipedia's own gold-mine icon (`/map-icons/gold-mine.png`, 64x53), `data-mine`, centred on `mines[].x/y`. A neutral building (tavern, goblin merchant, mercenary camp, goblin laboratory, marketplace…) is Liquipedia's icon for that unit, resolved from the shop's rawcode via `NEUTRAL_ICONS` (`src/lib/creep-routes/neutral-icons.ts`); an unresolved rawcode (a decorative critter/hut, not a real shop) renders nothing and is named in the build script's stdout. Every icon carries `title`/`aria-label` (e.g. "Goblin Merchant") and `pointer-events: none` so it never intercepts a camp click in the editor. Camp contents (creeps, their levels, whether they sleep) always come from the map catalogue, looked up by `campId` — never authored on the route, so a route can never invent what's in a camp.
- **Camp label rule (F009).** A camp id like "c09" means nothing to a coach reading a route — `campLabel(camp)` (`src/lib/creep-routes/camp-label.mjs`) turns it into "<highest-level creep's name>" plus " +N" when the camp has more creeps than that one (ties keep the creep data's own order, not alphabetical), e.g. "Giant Skeleton Warrior +2"; `campComposition(camp)` lists every creep, "1× Giant Skeleton Warrior · 1× Sludge Flinger · 1× Skeleton Archer". Every reader-facing surface uses these — the step table's Camp column, the hover panel's title, the editor's stop rows, the map's `aria-live` readout, the `HowTo` JSON-LD step names — never the raw id. The id itself never disappears entirely: it stays in `data-camp` and in marker `aria-label`s, which are tooling, not reader-facing copy.
- **Legend.** A one-line legend under the map (route page and editor alike, wraps on mobile) explains the marks: the three band dots with their level ranges, the red/blue base X, the gold-mine icon, and a small "Map icons via Liquipedia" attribution (the map icons are Blizzard art hosted on Liquipedia; the site's own Blizzard icon set — `public/wc3-icons`, from the W3Champions launcher — needs no such credit, it ships with the launcher itself).
- **The route path and stop numbers.** A route draws as a polyline through its camp stops in order, skipping `campId: null` stops (a TP-home, a shop visit — those show only in the table, never on the map). The line is `--wg-gold` with a `--wg-bg` under-stroke, so it reads over any terrain. Each camp stop gets a numbered gold badge, its number the stop's real 1-based position in `route.stops` — so a badge's number always matches the table row of the same colour, even when a non-camp stop sits between two camps and the map skips it. The active stop's marker and its route-path badge both enlarge (`transform: scale()` on a wrapper `<g>`, never a CSS transition of the circles' own `r` — that forces layout/paint on every change instead of a compositor-only step) and the marker gets a soft pulsing ring (SMIL `<animate>`, entirely omitted — not merely paused — under `prefers-reduced-motion: reduce`, read live via `useReducedMotion`, `src/lib/useReducedMotion.ts`); this now actually holds (F009 fixed both: the `r`-transition and the unconditional SMIL ring were the motion rule's two open violations going into that feature).
- **"Bring" icons.** The step table's Bring column shows the units the *player* brings to a stop (`GameIcon` × count) — this is never the camp's contents, which are the map's, not the route's.
- **Table anatomy (F009).** Headers read "#", "Camp", "Bring", "Notes", "Hero after" — full words, not the bare originals a first-time reader had to guess at. A one-line muted `<caption>` above the table spells out the two that still need it: "Bring: units to take into the fight · Hero after: your hero's level and XP once the camp is cleared." A stop's Condition (a short "if…" trigger, e.g. "if harassed") renders as a chip inside the Notes cell, above the Note text, with `title="Condition"` — Condition and Note are visually distinct even though both are free text.
- **The computed hero level.** `deriveRoute` (`src/lib/creep-routes/derive.mjs`) runs a hero through the route's camp stops in order and reports the level/xp after each stop ("Lv 2 · 306 xp" in the table, "After 3 stops: hero level 3 · 578 xp" in the editor's live readout), re-reading the creep-xp reduction factor at the hero's current level on every single kill (not once per camp — see `docs/creep-routes.md`'s "XP model"); this is derived, never authored, so it can never drift from the camp data.
- **Keyboard, mouse and assistive tech.** The map SVG is one keyboard stop (`role="img"`, `aria-label` naming the map and its camp/stop counts); arrow keys walk the route's camp stops (or every camp, with no route), Escape clears, and an `aria-live` region names the current camp (by its label, not its id) for anyone not hovering it. On the read-only route page (F009) a route's own camp markers are also real click/tap/keyboard targets — the outer `<g>` itself, `role="button" tabIndex=0`, not a nested `<button>`, so `data-camp` stays exactly one per camp — clicking one selects/deselects the matching table row and vice versa, the same effect a keyboard-walk step gives; every other camp on the map stays a plain, non-interactive mark (clicking it would be a dead button, since it isn't part of this route). The step table is a real `<table>` and is the map's fallback for assistive tech — it needs no separate accessible view. Hover is one delegated `pointerover`/`pointerout` pair on the `<svg>` (`closest('[data-camp]')`), not a handler per marker — `CampMarker` and `RoutePath` are both `React.memo`d, so hovering one camp on a 20+ camp map no longer re-renders every other marker (F009, following the F009 code review's item 3).

### List

`/learn/creep-routes` (`RouteRow`, `src/components/creep-routes/`) copies `BuildRow`'s grid, so the two list pages read as one family: race crest · title + summary + meta line · a right-hand column with the difficulty badge and an updated-date/stop-count line, same breakpoints, same `panel` treatment, same left-edge accent bar (by `level` here — `standard` gold, `beginner` win-green — where `BuildRow` keys the same accent off `difficulty`).

- **Row anatomy.** Crest (`/factions/large/<race>.webp`) · title + one-line summary · a meta line reading `vs <opponent icons>` (`VsRaces`, shared with builds) · map name (+ `· map v<mapVersion>` when known, a middle dot so the map's own name — which may itself end in a version-like "v2" — never runs straight into the patch number, e.g. "Autumn Leaves v2 · map v2.0", not the old "Autumn Leaves v2 v2.0") · stop count · author · up to 3 tags (`TagChip`, shared with builds), e.g. "Autumn Leaves v2 · map v2.0 · 4 stops · by Gym coaches". The right column stacks the route's difficulty badge over a `tnum` line: the updated date and the stop count.
- **Difficulty vocabulary (F009).** The UI word is **"Difficulty"** everywhere a reader sees it — the list filter, the badge, the editor's field — with values **Beginner**/**Standard** and, wherever the two-tier scale needs explaining (the editor's hint, the list filter's `title`), the same sentence: "Standard is the current meta route; Beginner is the safer, simpler one." The *internal* field is still named `level` (API, Sanity schema, `RouteLevel` type — all unchanged): only the word a reader sees changed, not the data shape. A build's own `difficulty` is a different, three-tier enum (beginner/intermediate/advanced) — `RouteFilters` stays a sibling of `MatchupPicker`, not a reuse of it, for that reason; the map select has no build-list equivalent either.
- **Unit words.** Always the plural noun after the count, lower case, no abbreviation: "4 stops", "1 route" / "5 routes" (the result count in the filter bar), never "4 camps" (a route's stop count, not the map's camp count — those differ when a stop is a TP-home or shop visit).
- **Tags (F009).** Shown as `TagChip`s, exactly like builds — up to 3 on the list row, every one on the detail page. Persisted tags (a Sanity field, editor submission) are F010; today only the fixtures carry any, so the display code already exists ahead of the data path.
- **Filters live in the URL**, `?race=&vs=&map=&level=&q=&sort=`, applied with `router.replace(..., { scroll: false })` so the list is shareable and back/forward-safe; every control applies on change except the search box, debounced 300 ms — the same pattern as `/learn/builds`' `MatchupPicker`.
- **No map thumbnail on the row.** `CreepMap` was considered per-row at ~120px (its `highlightCamps` prop exists for exactly this), but at that size on a narrow phone width the row either clips the crest/meta column or grows tall enough to break the list's scan rhythm; skipped for this feature. The full map lives on the detail page.

### Editor

`/learn/creep-routes/submit` (`RouteSubmitForm`, `src/components/creep-routes/`) is click-to-author, not draw-to-author: an author never types a camp's contents, only clicks the camps in the order they clear them. Map left, stops right, live totals sticky under the stop list — one tool, not two panels that happen to sit side by side. Three numbered sections, `SectionTitle` (F009, matching `/learn/builds/submit`'s own numbered heading exactly so the two editors read as one family, not two different-feeling tools): **1 · Route setup**, **2 · Stops — click camps on the map**, **3 · Notes & credit**.

- **The map is the input.** `CreepMap` in edit mode (`onCampSelect` given, `asGroup` unset) renders every camp as a real `<button>` (`data-camp="<id>"`, `aria-label="Camp c09, medium, level 7"` (`, on the route` appended when pressed), `aria-pressed` once the camp has a stop on the route being built) instead of a plain mark — focus and hover read exactly like any other button in the site, no bespoke affordance to learn. A camp is on the route at most once via this click path: a click on a camp not yet on the route appends a stop; a click on a camp already there removes that stop (toggle) — `aria-pressed` and the removal are the same affordance. A prefilled/imported route with a repeated `campId` (older data, the schema still allows it) is displayed as-is; only the click path enforces "once". The route drawn while editing (`RoutePath`, the same component the read-only detail page uses) updates on every click, so the numbered path is live proof of the order, not a promise.
- **"Your spawn" picker.** `RouteEditor` shows a small radio picker labelled "Your spawn" under the map, but only when the chosen map has more than two starts (Turtle Rock, Twisted Meadows) — every other map has exactly one start left once you've picked your race and side, so there's nothing to pick. Choosing an option sets `start` (an index into `map.starts`) and the red X on the map moves immediately. Changing the map resets `start` back to 0.
- **A stop row never asks for camp contents.** A camp stop shows its `campLabel` (see "Camp label rule" above, not the raw id), its band dot and `campComposition` as a muted one-line summary — read-only, the same rule the detail page follows ("camp contents always come from the catalogue, never authored on the route"). A base-action stop (`+ Base action`, `campId: null`) is the one row that takes free text, naming the action (placeholder: "e.g. TP home, expand, shop") — and, since F009, the *only* fields it shows: Bring and Condition are hidden entirely for a base action (neither means anything for "TP home"), not merely left blank. Every field with a non-obvious meaning gets a one-line hint under it (Note: "What to do at this camp and why"; Condition: "Short trigger shown before the note, e.g. if harassed, if no scout"; Against: "Leave empty for any opponent"; Companion build: "The build order this route is played with"); the collapsed hero picker button shows the word "Hero" next to its icon placeholder, so it reads as a control on first load, not a leftover.
- **No time field at all.** A route is an ordered list of stops, nothing more (F007, user decision: "the timings are not important and can be removed") — a stop row has no clock input to fill in or get wrong.
- **Stops reorder only on request.** Up/down arrows and a remove button move a stop; nothing reorders a row out from under the author mid-edit — order is the only thing that matters, so it is never silently "fixed" for the author. Removing a stop moves focus to the next stop's Remove button (or the previous one, if the removed stop was last, or "+ Base action" when the list becomes empty) — never silently to `<body>`.
- **The live readout is the same math as the detail page.** `deriveRoute` (`derive.mjs`) runs under the stop list exactly as it does on `/learn/creep-routes/<slug>` — "After 3 stops: hero level 3 · 578 xp" — so what an author sees while building is the same number a reader sees after publish, never a separate estimate.
- **The dangling label fix (F009).** `RouteSetup`'s Difficulty field is a button group, not one control, so it can't take a `<label htmlFor>` pointing at a single id; it's `role="group" aria-labelledby="route-difficulty-label"` named by a plain `<p>`, the same pattern "Your race"/"Against" already used.
- **The "submissions closed" state renders on the server.** `canAcceptSubmissions()` (project id + write token) is read in `page.tsx`, a Server Component, and passed down as a plain boolean prop; the client form's very first render branches on it, so a curl of the page — not just a failed client-side submit — sees the closed notice when there's no token, the same SSR-first rule `CreepMap`'s own sizing already follows.

### New colour tokens

| Token | Value | Job | Tested |
|---|---|---|---|
| `--wg-camp-easy` | `#68c040` | Easy camp mark (level <= 9) | Against `#000000`: 9.2:1 |
| `--wg-camp-medium` | `#d0a838` | Medium camp mark (level 10-19) | Against `#000000`: 9.34:1 |
| `--wg-camp-hard` | `#b01818` | Hard camp mark (level >= 20) | Against `#000000`: 2.99:1 — below the >= 3:1 floor on its own |

F008 replaced the previous, self-derived palette (`#6BE0C8`/`#E0863A`/`#C23050`) with Liquipedia's own marker colours (the dominant opaque pixel of their marker PNGs) — a deliberate trade against the dataviz skill's own >= 3:1-per-mark rule, made because matching a resource players already read outweighs the marginal contrast loss on the hard band. `#b01818` alone measures 2.99:1 against black (WCAG relative luminance, `(L1+0.05)/(L2+0.05)`), just under the floor, so every camp circle also gets a `rgba(255,255,255,.55)` light halo ring outside its dark under-stroke (`CampMarker`) — that combination reads at full contrast against black *or* white, covering every terrain colour in between. The values were checked with the same small WCAG contrast script the F003 palette used (`dataviz`'s `validate_palette.js` still not present on disk).

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
