import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpenText,
  Calendar,
  Film,
  Keyboard,
  LayoutDashboard,
  Map,
  MonitorPlay,
  Swords,
  Tv,
} from "lucide-react";
import { DASHBOARD_URL } from "./links";

export type Tool = {
  href: string;
  Icon: LucideIcon;
  title: string;
  body: string;
  /** Who makes it; omitted for the Gym's own tools. */
  by?: string;
  badge?: string;
};

/** Apps and services built by the Gym. */
export const GYM_TOOLS: Tool[] = [
  {
    href: "/tools/overlay",
    Icon: MonitorPlay,
    title: "Build order overlay",
    badge: "Beta",
    body: "A desktop app that floats a build order over Warcraft III while you play, with a clock and global shortcuts.",
  },
  {
    href: DASHBOARD_URL,
    Icon: LayoutDashboard,
    title: "Player dashboard",
    body: "Availability, scheduling, results and your fantasy team for the Gym Newbie League.",
  },
];

/** Community tools and sites the Gym recommends. Order: play, learn, watch. */
export const COMMUNITY_TOOLS: Tool[] = [
  {
    href: "https://w3champions.com/getting-started/",
    Icon: Swords,
    title: "W3Champions",
    by: "W3Champions",
    body: "The community ladder: matchmaking from newbie to grandmaster, host bots for better pings, stats, updated map pools, live games and replays.",
  },
  {
    href: "https://wc3.no/",
    Icon: Activity,
    title: "Ape Science Research Facility",
    by: "Longjacket",
    body: "Build orders and creep routes with a community hub, plus ladder and event tracking for players across the scene.",
  },
  {
    href: "https://coff-creeps.web.app/",
    Icon: Map,
    title: "Coff Creeps",
    by: "Coff",
    body: "Plan creep routes on every ladder map: how much experience each camp gives, where your hero ends up and which items can drop.",
  },
  {
    href: "https://jcfields.gitlab.io/warcraft3-hotkey-editor/",
    Icon: Keyboard,
    title: "Custom Hotkeys Editor",
    by: "jcfields",
    body: "A simple editor that writes your CustomKeys.txt for you. Grid layouts and everything else, no manual file editing.",
  },
  {
    href: "https://replaytool.warcraft3.org/en:home",
    Icon: Film,
    title: "Replay Tool",
    by: "LadyRisa",
    body: "A local app for analysing replays: build timings, hero levels, APM and what your opponent was doing while you looked away.",
  },
  {
    href: "https://warcraft3.info/",
    Icon: Calendar,
    title: "Warcraft3.info",
    by: "warcraft3.info",
    body: "Replays, news, an event calendar and the Warcraft 3 Info League. Home of Orc Brain, which grades your hotkeys and habits from a replay.",
  },
  {
    href: "https://liquipedia.net/warcraft/Main_Page",
    Icon: BookOpenText,
    title: "Liquipedia",
    by: "Liquipedia",
    body: "The competitive encyclopedia: tournaments past and upcoming, players, casters and results.",
  },
  {
    href: "https://www.back2warcraft.com/",
    Icon: Tv,
    title: "Back2Warcraft",
    by: "Back2Warcraft",
    body: "The place to watch high-level Warcraft III: Twitch casts of most major events and a YouTube archive going back over a decade.",
  },
];
