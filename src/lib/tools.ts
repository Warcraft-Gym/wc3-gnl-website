import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Crosshair,
  FileSearch,
  Gamepad2,
  GitCompare,
  Keyboard,
  ListOrdered,
  Map,
  MonitorPlay,
  PlayCircle,
  Swords,
  Video,
} from "lucide-react";

export type Tool = {
  href: string;
  Icon: LucideIcon;
  title: string;
  body: string;
  /** Who makes it; omitted for the Gym's own tools. */
  by?: string;
  badge?: string;
  /** 16:9 preview in public/tools/, a screenshot of the tool. */
  image: string;
};

export type ToolGroup = { title: string; blurb?: string; tools: Tool[] };

/** Apps and services built by the Gym. */
export const GYM_TOOLS: Tool[] = [
  {
    href: "/tools/overlay",
    image: "/tools/overlay.webp",
    Icon: MonitorPlay,
    title: "Build order overlay",
    badge: "Beta",
    body: "A desktop app that floats a build order over Warcraft III while you play, with a clock and global shortcuts.",
  },
];

/** Community tools the Gym recommends, grouped the way players ask for them. */
export const COMMUNITY_TOOL_GROUPS: ToolGroup[] = [
  {
    title: "Ladder",
    tools: [
      {
        href: "https://w3champions.com/",
        image: "/tools/w3champions.webp",
        Icon: Swords,
        title: "W3Champions",
        by: "W3Champions",
        body: "The community-made ladder and where most people play: matchmaking from newbie to grandmaster, host bots, stats, updated map pools and replays.",
      },
    ],
  },
  {
    title: "Replay parsers",
    blurb: "Drop in a replay and see what actually happened: every unit, building and upgrade, timed.",
    tools: [
      {
        href: "https://wc3.no/#/season",
        image: "/tools/ape-science-season.webp",
        Icon: BarChart3,
        title: "Ape Science season view",
        by: "Longjacket (dermave)",
        body: "Look up a player's W3Champions season, open any game and get a deep breakdown of when each unit and building was created.",
      },
      {
        href: "https://w3tools.hexcoding.de/",
        image: "/tools/w3tools-buildorder.webp",
        Icon: GitCompare,
        title: "W3Tools build order compare",
        by: "dermave",
        body: "Compare one replay to another, for example you doing a build next to a pro doing the same build, and see exactly where the timings diverge. Open BuildOrder in the sidebar.",
      },
      {
        href: "https://wc3analytics.com/",
        image: "/tools/wc3analytics.webp",
        Icon: FileSearch,
        title: "Warcraft 3 Analytics",
        by: "ikbencool",
        body: "Detailed stats per unit, building, upgrade and item with gold and wood spent, APM analysis, a hotkey analyser and the in-game chat.",
      },
      {
        href: "https://pbug90.github.io/wc3-replay-parser-web/",
        image: "/tools/pbug-replay-parser.webp",
        Icon: FileSearch,
        title: "Warcraft III Replay Parser",
        by: "PBug90",
        body: "Parse a replay in the browser, search replays by BattleTag and compare two replays side by side.",
      },
      {
        href: "https://wc3v.com/",
        image: "/tools/wc3v.webp",
        Icon: PlayCircle,
        title: "WC3V",
        by: "WC3V",
        body: "A replay simulator built for learning: play a game back in the browser, browse pro build orders and see how yours compares.",
      },
    ],
  },
  {
    title: "Build order overlays",
    tools: [
      {
        href: "https://jinzo92.github.io/WC3-Build-Order-Helper/",
        image: "/tools/build-order-helper.webp",
        Icon: ListOrdered,
        title: "WC3 Build Order Helper",
        by: "Jinzo",
        body: "Runs side by side with the game and walks you through a build step by step, with a timer, gold and supply targets.",
      },
    ],
  },
  {
    title: "For streamers",
    tools: [
      {
        href: "https://w3booster.com/",
        image: "/tools/w3booster.webp",
        Icon: Video,
        title: "W3Booster",
        by: "W3Booster",
        body: "A workspace that connects Warcraft III to your stream: match data, power overlays, live game data and an observer mode for your broadcast.",
      },
    ],
  },
  {
    title: "Other cool tools",
    tools: [
      {
        href: "https://coff-creeps.web.app/",
        image: "/tools/coff-creeps.webp",
        Icon: Map,
        title: "Coff Creeps",
        by: "Coff",
        body: "Plan your own creep routes on every ladder map and see what hero level each camp gets you.",
      },
      {
        href: "https://wc3.no/#/games/storm",
        image: "/tools/hotkey-storm.webp",
        Icon: Keyboard,
        title: "Storm Key",
        by: "Longjacket",
        body: "A game to drill the hotkeys of every race until they are muscle memory, with high scores to chase.",
      },
      {
        href: "https://ptenix.github.io/mmr-counter/",
        image: "/tools/mmr-counter.webp",
        Icon: Gamepad2,
        title: "MMR Counter",
        by: "PteN",
        body: "Your maximum, minimum and average W3Champions MMR by season, and more stats about your ladder history.",
      },
      {
        href: "https://www.makrura.com/games/attack-armor-value",
        image: "/tools/attack-armor-game.webp",
        Icon: Crosshair,
        title: "Attack and Armor Value Game",
        by: "Makrura, inspired by SaulApeMan",
        body: "A quiz that checks whether you really know the attack and armour type table. Hardcore mode included.",
      },
    ],
  },
];
