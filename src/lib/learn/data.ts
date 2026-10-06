import type { Race } from "@/lib/utils";
import { CREEP_ROUTE_DEMO } from "./creep-route-demo.mjs";

/**
 * Learn section content. Structured like the live "Learn Warcraft 3" hub:
 * race + topic categories, and a set of guides tagged by category and level.
 * Fixture content for now, swappable to a CMS later (see src/lib/content).
 */

export type LearnCategoryId =
  | "new-players"
  | "human"
  | "night-elf"
  | "orc"
  | "undead"
  | "creep-routes"
  | "mechanics";

export type GuideLevel = "beginner" | "intermediate" | "advanced";

export type LearnCategory = {
  id: LearnCategoryId;
  title: string;
  blurb: string;
  /** Race categories render the faction icon; topics use a lucide icon. */
  kind: "race" | "topic";
  race?: Race;
  /** Slug of a guide rendered in full as the category page's main content. */
  featuredGuide?: string;
  /** The category in "More … guides" under a guide, when `title` reads wrong there. */
  moreLabel?: string;
};

export type Guide = {
  slug: string;
  title: string;
  category: LearnCategoryId;
  level: GuideLevel;
  excerpt: string;
  minutes: number;
  publishedAt: string;
  /** Fixture body (plain paragraphs). */
  paragraphs?: string[];
  /** Sanity body (Portable Text blocks). */
  body?: unknown[];
  /** Sanity cover image (featured image). */
  coverImage?: unknown;
};

export const LEARN_CATEGORIES: LearnCategory[] = [
  {
    id: "new-players",
    title: "New & returning players",
    blurb: "Just installed, or back after years away? Start here.",
    kind: "topic",
    featuredGuide: "new-returning-players-guide-to-warcraft-iii",
  },
  {
    id: "human",
    title: "Human",
    blurb: "Riflemen, towers, and disciplined expansions.",
    kind: "race",
    race: "human",
  },
  {
    id: "night-elf",
    title: "Night Elf",
    blurb: "Mobility, micro, and map control.",
    kind: "race",
    race: "nightelf",
  },
  {
    id: "orc",
    title: "Orc",
    blurb: "Aggressive timings and raw army value.",
    kind: "race",
    race: "orc",
  },
  {
    id: "undead",
    title: "Undead",
    blurb: "Creep efficiency and precise tech timings.",
    kind: "race",
    race: "undead",
  },
  {
    id: "creep-routes",
    title: "Creep Routes",
    moreLabel: "Creep Route",
    blurb: "Where to farm, what drops, and when to move.",
    kind: "topic",
  },
  {
    id: "mechanics",
    title: "Game Mechanics",
    blurb: "Upkeep, items, experience, the systems under the game.",
    kind: "topic",
  },
];

export function getCategory(id: string): LearnCategory | undefined {
  return LEARN_CATEGORIES.find((c) => c.id === id);
}

let keySeq = 0;
/** One Portable Text block of plain text, so a fixture guide renders through
 *  `PortableBody` like a Sanity guide and can hold its block types. */
function block(text: string, style = "normal", listItem?: "number" | "bullet") {
  const children = [{ _type: "span", _key: `s${keySeq++}`, text, marks: [] }];
  return { _type: "block", _key: `b${keySeq++}`, style, markDefs: [], children, ...(listItem ? { listItem, level: 1 } : {}) };
}
const p = (text: string) => block(text);
const step = (text: string) => block(text, "normal", "number");
const bullet = (text: string) => block(text, "normal", "bullet");

export const GUIDES: Guide[] = [
  {
    slug: "your-first-week-in-warcraft-3",
    title: "Your first week in Warcraft III",
    category: "new-players",
    level: "beginner",
    minutes: 6,
    publishedAt: "2026-08-18",
    excerpt:
      "A no-pressure roadmap for brand-new players: pick a race, learn one opening, and get your first ladder games in.",
    paragraphs: [
      "Warcraft III can feel overwhelming at first, four races, dozens of units, and a clock that never stops. The good news: you do not need to learn all of it to start having fun and winning games.",
      "Pick one race and stick with it for your first week. You will improve far faster learning one race deeply than dabbling in all four. If you have no preference, Human is the most forgiving for beginners.",
      "Learn exactly one opening build order and repeat it every game. Your goal this week is not to win. It is to stop getting supply-blocked, keep your hero alive, and finish a game without panicking.",
    ],
  },
  {
    slug: "hotkeys-and-camera-setup",
    title: "Hotkeys and camera setup that actually help",
    category: "new-players",
    level: "beginner",
    minutes: 4,
    publishedAt: "2026-08-12",
    excerpt:
      "Small setup changes that pay off every single game, grid hotkeys, control groups, and camera habits.",
    paragraphs: [
      "Before you grind mechanics, spend ten minutes on setup. Grid hotkeys map abilities to the same physical keys across every unit, so you are not memorising a different layout for each caster.",
      "Bind your hero to control group 1 and your main army to 2. Getting into the habit of tapping 1 to check on your hero is one of the highest-value beginner habits there is.",
    ],
  },
  {
    slug: "rifleman-opening-for-beginners",
    title: "A clean Rifleman opening for beginners",
    category: "human",
    level: "beginner",
    minutes: 5,
    publishedAt: "2026-08-16",
    excerpt:
      "The most reliable Human opening: Archmage, a couple of creep camps, and a Rifleman timing you can repeat every game.",
    paragraphs: [
      "Riflemen are the backbone of beginner Human play: ranged, cheap, and strong when clumped behind a few Footmen. This opening gets you to a safe timing without any fiddly micro.",
      "Open with an Altar and Farms, take Archmage, and use Water Elementals to clear a green camp for early experience. Add a Barracks and start Riflemen as your gold allows.",
    ],
  },
  {
    slug: "human-base-layout-and-timings",
    title: "Human base layout and defensive timings",
    category: "human",
    level: "intermediate",
    minutes: 7,
    publishedAt: "2026-08-09",
    excerpt:
      "Where to place Farms and Towers so your base defends itself while you focus on the map.",
    paragraphs: [
      "A good Human base is a wall you barely have to think about. Line Farms to funnel attackers and keep your Town Hall covered by a tower or two before you commit army to the map.",
      "The timing that matters most is the first enemy pressure. If your layout buys you even ten seconds, that is enough to rally militia and swing a fight you would otherwise lose.",
    ],
  },
  {
    slug: "tavern-hero-opening-night-elf",
    title: "The Tavern-hero opening for Night Elf",
    category: "night-elf",
    level: "intermediate",
    minutes: 6,
    publishedAt: "2026-08-14",
    excerpt:
      "Grab a neutral hero first to power up your creeping and open more mid-game paths.",
    paragraphs: [
      "Opening with a Tavern hero gives Night Elf flexibility: a Beastmaster or Naga changes how you creep and what you threaten, without committing to a tech path early.",
      "The key is creep efficiency, use the extra hero to clear tougher camps sooner, snowball item and experience leads, and keep your Wisps safe while you expand.",
    ],
  },
  {
    slug: "wisp-positioning-basics",
    title: "Wisp positioning basics",
    category: "night-elf",
    level: "beginner",
    minutes: 4,
    publishedAt: "2026-08-06",
    excerpt:
      "Small Wisp habits that protect your economy and set up detonate value in fights.",
    paragraphs: [
      "Wisps are your economy and your utility. Keep spare Wisps tucked out of harm's way but close enough to detonate enemy summons and buffs when a fight breaks out.",
      "When you expand, pull Wisps in a tight group so you are not walking them one at a time into an ambush.",
    ],
  },
  {
    slug: "headhunter-timing-pushes",
    title: "Headhunter timing pushes for Orc",
    category: "orc",
    level: "intermediate",
    minutes: 6,
    publishedAt: "2026-08-15",
    excerpt:
      "Turn quick Headhunters into map pressure before your opponent stabilises.",
    paragraphs: [
      "Orc thrives on tempo. Fast Headhunters backed by a Far Seer's Wolves let you contest creep camps and expansions while your opponent is still teching.",
      "The push does not need to kill, forcing your opponent to react on your schedule is the win. Trade efficiently and keep your Grunts topped up between fights.",
    ],
  },
  {
    slug: "fast-death-knight-fundamentals",
    title: "Fast Death Knight fundamentals",
    category: "undead",
    level: "beginner",
    minutes: 5,
    publishedAt: "2026-08-13",
    excerpt:
      "Why the Death Knight opening is the Undead backbone, and how to creep it safely.",
    paragraphs: [
      "The Death Knight's Death Coil keeps your units alive through creeps and fights, making a fast DK the safest Undead opening to learn first.",
      "Pair it with Ghouls for creeping and lumber, and use Coil to top up whichever unit is about to die. Efficient creeping here sets up everything that follows.",
    ],
  },
  {
    slug: "fiends-with-fast-tech",
    title: "Crypt Fiends with fast tech",
    category: "undead",
    level: "advanced",
    minutes: 8,
    publishedAt: "2026-08-04",
    excerpt:
      "Skipping ahead on tech to reach a Fiend army that outranges and out-scales.",
    paragraphs: [
      "Rushing tech to Crypt Fiends trades early safety for a stronger mid-game. Fiends outrange most early armies and their Web shuts down air, but the window before they arrive is fragile.",
      "The whole build lives or dies on creep efficiency and scouting. Know where the enemy is before you commit, and defend the tech window with Coil timings and good positioning.",
    ],
  },
  {
    slug: "understanding-creep-routes",
    title: "Understanding creep routes",
    category: "creep-routes",
    level: "intermediate",
    minutes: 8,
    publishedAt: "2026-08-11",
    excerpt:
      "Learn how to read Warcraft Gym creep routes. View a map, inspect every creep camp, and follow a detailed route written by our community.",
    body: [
      block("Reading creep camps and item drops", "h2"),
      p("Green, yellow and red camps signal how hard they hit and what they drop. Learning to read them at a glance tells you which camps are safe to take early and which need a hero level or two first."),
      p("The colour comes from the camp's level, the sum of its creeps' levels: easy is 9 or less, medium 10 to 19, hard 20 or more. Hover or tap a camp on a route's map to see its creeps and what each one can drop."),
      p("Prioritise camps that drop the items and experience your build wants. A good creep route is not the most camps, it is the right camps, in an order that keeps your hero and army safe."),
      block("Following a creep route", "h2"),
      p("A creep route is a list of steps in time. Camps are stops; a step can also mark a place or an action. This example follows a Night Elf Demon Hunter on Springtime."),
      { _type: "creepRouteCard", _key: "example-route-card", slug: CREEP_ROUTE_DEMO.source },
      block("The map", "h3"),
      p("Each camp stop is a numbered disc in its camp's colour. The line joins steps that are places on the route. Small dots are camps the route does not take. The red X is your base. Hover or tap a camp to see its creeps and drops."),
      { _type: "creepRoutePart", _key: "route-map", part: "map", ...CREEP_ROUTE_DEMO },
      block("The stops", "h3"),
      p("The list puts the steps in time order. A camp stop shows the hero's level and XP after it. Check the level to see if you are on pace, and open a step for its details."),
      { _type: "creepRoutePart", _key: "route-stops", part: "stops", ...CREEP_ROUTE_DEMO },
      block("The kill order", "h3"),
      p("An open stop shows how to take its camp. This is stop 4:"),
      { _type: "creepRoutePart", _key: "route-stop", part: "stop", stop: CREEP_ROUTE_DEMO.zoom.stop, ...CREEP_ROUTE_DEMO },
      bullet("Numbered creeps die in that order, left to right."),
      bullet("Creeps in one box are a group: kill them in any order."),
      bullet("A gold frame marks the kill that levels the hero. If the level comes inside a group, its box turns gold."),
      bullet("A blue frame marks a creep that drops an item, a red frame one that drops a Power Up. Tap it to see what it can drop."),
      bullet("A grey, dashed creep is skipped: the route leaves it alive."),
      bullet("Bring shows who goes to this camp."),
      bullet("The note holds the author's tips. Read it before you pull."),
      p("Try it: change the kill order of the same stop and watch the hero meter."),
      { _type: "killOrderDemo", _key: "kill-order-demo", ...CREEP_ROUTE_DEMO },
      block("Advanced: XP and levels", "h3"),
      p("A hero gets less XP from a creep as it levels: 80% of the creep's XP at level 1, 70% at level 2, 60% at level 3 and 50% at level 4. From level 5, creeps give no XP. The rate is set at each kill, so the kill that gives a level lowers the XP of every kill after it. The +XP under each kill already includes this."),
      p("The numbers assume one hero. With two heroes alive, each kill's XP is shared between them."),
      p("The levels assume you take every stop, conditions included."),
      block("Routes that split", "h2"),
      p("Some routes split where the right play depends on the game. \"Choose one path\" shows each path as a tab: its stops read 3a, 4a or 3b, and the numbers run along the path you chose."),
      { _type: "creepRoutePart", _key: "split-stops", part: "stops", needs: "split", slugs: ["early-creep-route-vs-solo-blademaster-windwalk-b1c6", "undead-ves-autumn-leaves"] },
      block("Waypoints", "h2"),
      p("A waypoint is a step at a place with no creeps and no number. There are three choices when you add a step like this:"),
      { _type: "routeStepKey", _key: "route-step-key" },
      p("A pin marks a place that matters at that moment. The list says \"Meanwhile\" and the map draws it with a dashed edge. This route has a pin; compare its map and list:"),
      { _type: "creepRoutePart", _key: "waypoint-map", part: "map", needs: "pin", slugs: ["standard-early-creep-route-vs-dh-naga-0479", "undead-ves-echo-isles"] },
      { _type: "creepRoutePart", _key: "waypoint-stops", part: "stops", needs: "pin", slugs: ["standard-early-creep-route-vs-dh-naga-0479", "undead-ves-echo-isles"] },
      p("A waypoint row can name its place, such as \"their base\", \"a gold mine\" or \"Goblin Merchant\". A free point on the map has no place label. Bring tells you who goes there; it does not change the line."),
      block("Attacks", "h2"),
      p("An attack is a numbered red disc with swords, and the leg into it is red."),
      { _type: "creepRoutePart", _key: "attack-map", part: "map", needs: "attack", slugs: ["am-lvl-3-rush-into-harass-9a77", "nightelf-aow-turtle-rock"], choice: { 3: 1 } },
      block("Take all paths simultaneously", "h2"),
      p("When paths run at the same time, the list shows them together. The shared level and XP result sits in the heading, above the paths. The heading opens them all together. A gold double chevron before the level means the hero levels during these paths. Either path may give the level-up kill."),
      { _type: "creepRoutePart", _key: "same-time-stops", part: "stops", needs: "and", slugs: ["am-lvl-3-rush-into-harass-9a77", "human-no-expansion-tidehunters"] },
      p("That example includes a harass, which may give no XP. Here, both paths clear a creep camp, so either camp could cause the level up:"),
      { _type: "creepRoutePart", _key: "same-time-two-camps", part: "stops", needs: "and", slugs: ["fastest-lvl-3-1274"] },
      block("Who goes", "h2"),
      p("Bring says who goes to each step. The map line shows where the route goes; it does not say which units go there."),
      block("Pictures", "h2"),
      p("Some stops have pictures of the spot. Tap one to see it full size."),
      block("Writing a creep route", "h2"),
      p("Have a route of your own? The route builder has three steps:"),
      step("Route setup: pick the map, your race, the opponent and the difficulty."),
      step("Steps: click camps on the map in time order. The dashed line shows where the next step goes. Use Waypoint for a place with no creeps or an action with no place; choose On the route, A pin or No place. Use Two paths to choose one path or take all paths simultaneously. Add a kill order, a note, who to Bring and a condition where needed."),
      step("Notes and credit: add a title, a summary and your name."),
      { _type: "submitRouteCta", _key: "submit-route-cta" },
      { _type: "creepRouteList", _key: "creep-route-list" },
    ],
  },
  {
    slug: "upkeep-and-the-food-economy",
    title: "Upkeep and the food economy",
    category: "mechanics",
    level: "beginner",
    minutes: 5,
    publishedAt: "2026-08-10",
    excerpt:
      "How upkeep taxes your gold, and why timing your army around it matters.",
    paragraphs: [
      "Upkeep quietly reduces your gold income as your food climbs, low, high, then no upkeep. Understanding the thresholds tells you when to fight, when to expand, and when to spend down.",
      "Strong players ride the upkeep line deliberately: pushing food up for a decisive fight, then trading down and expanding to reset their economy.",
    ],
  },
  {
    slug: "item-levels-and-where-they-drop",
    title: "Item levels and where they drop",
    category: "mechanics",
    level: "advanced",
    minutes: 7,
    publishedAt: "2026-08-02",
    excerpt:
      "How charged, permanent, and power-up drops map to camp levels across the ladder pool.",
    paragraphs: [
      "Item drops are tied to camp level and type. Knowing which camps can drop a permanent versus a charged item lets you plan a creep route around the items your build actually wants.",
      "On each ladder map the valuable drops cluster in predictable places. Learning them turns creeping from busywork into a deliberate power spike.",
    ],
  },
];

export function guidesByCategory(id: LearnCategoryId): Guide[] {
  return GUIDES.filter((g) => g.category === id).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function latestGuides(n: number): Guide[] {
  return [...GUIDES]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, n);
}
