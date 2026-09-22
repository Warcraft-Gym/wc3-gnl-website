import { GNL_LADDER_LIVE } from "@/lib/flags";

export type NavItem = { href: string; label: string; external?: boolean };

/** Primary site header nav. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/blog", label: "News" },
  { href: "/learn", label: "Learn" },
  { href: "/learn/builds", label: "Builds" },
  { href: "/gnl/schedule", label: "League" },
  { href: "/tools", label: "Tools" },
  { href: "/about", label: "About" },
];

/** Secondary Learn section nav (rendered inside /learn). */
export const LEARN_NAV: NavItem[] = [
  { href: "/learn", label: "Guides" },
  { href: "/learn/human", label: "Human" },
  { href: "/learn/night-elf", label: "Night Elf" },
  { href: "/learn/orc", label: "Orc" },
  { href: "/learn/undead", label: "Undead" },
  { href: "/learn/builds", label: "Build orders" },
  { href: "/learn/new-players", label: "New players" },
];

/** Secondary GNL section nav (rendered inside /gnl). */
export const GNL_NAV: NavItem[] = [
  { href: "/gnl/schedule", label: "Schedule" },
  { href: "/gnl/standings", label: "Standings" },
  { href: "/gnl/teams", label: "Teams" },
  ...(GNL_LADDER_LIVE ? [{ href: "/gnl/ladder", label: "Ladder" }] : []),
  { href: "/gnl/fantasy", label: "Fantasy" },
  { href: "/gnl/rules", label: "Rules" },
  { href: "/gnl/about", label: "About" },
];
