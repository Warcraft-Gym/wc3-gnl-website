import type { Race } from "@/lib/utils";

/**
 * Learn section content. Structured like the live "Learn Warcraft 3" hub:
 * race + topic categories, and a set of guides tagged by category and level.
 * Fixture content for now — swappable to a CMS later (see src/lib/content).
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
};

export type Guide = {
  slug: string;
  title: string;
  category: LearnCategoryId;
  level: GuideLevel;
  excerpt: string;
  minutes: number;
  publishedAt: string;
  paragraphs: string[];
};

export const LEARN_CATEGORIES: LearnCategory[] = [
  {
    id: "new-players",
    title: "New & returning players",
    blurb: "Just installed, or back after years away? Start here.",
    kind: "topic",
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
    blurb: "Where to farm, what drops, and when to move.",
    kind: "topic",
  },
  {
    id: "mechanics",
    title: "Game Mechanics",
    blurb: "Upkeep, items, experience — the systems under the game.",
    kind: "topic",
  },
];

export function getCategory(id: string): LearnCategory | undefined {
  return LEARN_CATEGORIES.find((c) => c.id === id);
}

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
      "Warcraft III can feel overwhelming at first — four races, dozens of units, and a clock that never stops. The good news: you do not need to learn all of it to start having fun and winning games.",
      "Pick one race and stick with it for your first week. You will improve far faster learning one race deeply than dabbling in all four. If you have no preference, Human is the most forgiving for beginners.",
      "Learn exactly one opening build order and repeat it every game. Your goal this week is not to win — it is to stop getting supply-blocked, keep your hero alive, and finish a game without panicking.",
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
      "Small setup changes that pay off every single game — grid hotkeys, control groups, and camera habits.",
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
      "The key is creep efficiency — use the extra hero to clear tougher camps sooner, snowball item and experience leads, and keep your Wisps safe while you expand.",
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
      "The push does not need to kill — forcing your opponent to react on your schedule is the win. Trade efficiently and keep your Grunts topped up between fights.",
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
    slug: "reading-creep-camps-and-drops",
    title: "Reading creep camps and item drops",
    category: "creep-routes",
    level: "intermediate",
    minutes: 6,
    publishedAt: "2026-08-11",
    excerpt:
      "Camp colours, level ranges, and which camps are worth your time on ladder maps.",
    paragraphs: [
      "Green, orange, and red camps signal how hard they hit and what they drop. Learning to read them at a glance tells you which camps are safe to take early and which need a hero level or two first.",
      "Prioritise camps that drop the items and experience your build wants. A good creep route is not the most camps — it is the right camps, in an order that keeps your hero and army safe.",
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
      "Upkeep quietly reduces your gold income as your food climbs — low, high, then no upkeep. Understanding the thresholds tells you when to fight, when to expand, and when to spend down.",
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
