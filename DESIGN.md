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
| Race names and icon paths | `RACES` in `src/lib/utils.ts` |
| MMR chart | `src/components/league/MmrChart.tsx` |
| Race MMR chips | `src/components/league/RaceMmrChips.tsx` |
| Meter (one bar with a figure) | `src/components/ui/Meter.tsx` |

`pnpm test` runs the two test files with the test runner of Node.

## Figures

- A record reads `{wins} – {losses}`, with an en dash and one space on each side. From ten played it carries the percent: "19 – 11 (63%)". Under ten it stands alone: "3 – 1". Nothing played prints an em dash. `record()` writes every record on the site.
- Never write a record as "19/30", "19W 11L", "19-11" or "19W - 11L". A team record in a league with draws always prints three parts in the order wins, draws, losses: "6 – 1 – 3", and "12 – 0 – 8" with no draws. It carries no percent.
- One percent per record. A record that carries its percent has no "Win rate" tile or column beside it.
- A figure names what it counts. A series is a best of three in the league. A game is one game, on the ladder or inside a series. Never use one word for the other. A tile label reads "Series record" or "Ladder games", never "Record".
- A figure names its scope: this season, all GNL seasons, or a W3Champions ladder season. A ladder figure stands beside the W3Champions mark.
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
| Ladder races | `w3c_stats`: one row per race per W3Champions season, with MMR, games, wins and losses | `PlayerProfile.w3c` and the live ladder rows of the player page: the race MMR chips, the ladder table, the MMR chart |
| Signup race | `signup_race`: the race of one player in one season. A player may sign up with another race next season. | `Player.race` and `Player.mmr`: the race badge and the MMR of a roster row, always beside their season |
| Played race | The race a player picked in one series | The series row, beside that series only |
| Profile race | `race`: one value per player, a legacy field | A fallback only, when a season row holds no signup race |

- No surface treats a race as a fixed property of a player. A race always belongs to a ladder season, a league season or a series.
- The player page holds every ladder race with games in the newest W3Champions season that has rows, sorted by MMR from high to low. A roster row holds one race and one MMR, both of the signup race of its season. No surface prints an MMR without the race it belongs to, with one exception: an MMR typed in by hand for a player with no ladder rows.
- The main race is a display choice, not a data fact. `mainRace()` picks the race with the highest MMR among races with ten or more games. If no race has ten games, it picks the highest MMR of all. With no ladder games, it is the signup race, then the profile race.
- The main race selects the masthead art and the large icon of the player page, the bold race chip, the headline MMR tile, which names its race, and the first selected line of the MMR chart. It never hides another race.
- The player page shows one chip per ladder race: icon, MMR and the record. The record is printed, not hidden in a tooltip, so touch and keyboard readers get it too. The headline MMR tile names its race: "W3C MMR · Orc".
- The MMR chart draws one line per ladder race on one MMR axis. See "The MMR chart".
- A race is an icon first. Every race mark carries the race icon with its name as `alt` and `title`. A race name in text wears a text token, never the race colour.
- A race colour fills a mark with no text on it: a bar segment, a dot, a stripe. Race colours and result colours never encode data in the same mark set, because orc red sits close to `loss`.
- The Random race uses the neutral `random` token.

## Colour tokens for data

Values are tested on the black ground with the validator. A pair passes from ΔE 8 for a colour-blind reader and from ΔE 15 for full colour vision.

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
- The values are the dark theme values of the app. They hold on black, so the two sites share one set of data colours on dark grounds.
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
- A meter is one bar in one hue on a neutral track, with its figure beside it. It is never `win` on a `loss` track. A table cell carries the figure alone, with no bar.
- A stat tile holds one figure, its label and its scope. A row of tiles never holds two forms of one fact, such as a record and its win rate.
- An amount scale uses one hue from light to dark. A category uses the fixed race set or the result pair. Never add a colour to tell a fifth series apart. Use small multiples or select one line.

### The MMR chart

- One line per ladder race, all on one linear MMR axis, with a tick every 100 MMR or every 200 MMR when the range is wide, and a date axis with the first and last day.
- The selected race draws in `gold` at full strength, with its area fill, its dots and its end value. Every other race draws as a quiet 1.5 px line in a text token, with the race icon at its end as the direct label.
- A row of race buttons above the plot selects the line: icon, race name and MMR, sorted by MMR, the main race first. It is a button row, not a dropdown, because five options fit and every option stays visible.
- The readout names the race, the date and the MMR of the point. A change since the first point keeps its sign.
- A race with fewer than two points has a button and no line.

## Data flow

- The page reads per-race rows once and passes them down. A component never fetches its own copy.
- The W3Champions API serves the race rows and one MMR timeline per race. The timelines of all ladder races load in parallel on the server, with the 10 minute cache window of `src/lib/w3c.ts`. That is up to five small reads per player page per window, and none of them touch the league backend. The timelines of five races add about 5 KB to the page payload.
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

- The data colours are a proposal. The values above align the two sites on dark grounds. The alternative keeps green for a win and moves only the race colours away from `win` and `loss`. The measured cost of the alternative: the old pair passes the colour-blind check by lightness alone (ΔE 14.7), and old undead green and old orc red sit on top of `win` and `loss` (ΔE under 3).
- `--wg-arcane`, the blue of the cast and VOD chips, sits near `win`. It is a control colour and never a mark, so the two do not meet in one mark set. A later pass can move it.

## Known gaps

- The games-per-day bars of the ladder page draw no y-axis and have no keyboard route.
- A race button of the MMR chart that has too few points is disabled, and its reason sits in a `title` that the keyboard cannot reach.
- `--wg-line` at 18% is under the 3:1 floor for a line that separates figures.
- The smallest figure labels run under 10 px.
