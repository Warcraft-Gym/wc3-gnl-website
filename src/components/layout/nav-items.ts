export type NavItem = { href: string; label: string; external?: boolean };

/** Primary site header nav. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/gnl/schedule", label: "League" },
  { href: "/learn", label: "Learn" },
  { href: "/blog", label: "News" },
  { href: "https://discord.gg/7HUyQAKQ8p", label: "Discord", external: true },
];

/** Secondary GNL section nav (rendered inside /gnl). */
export const GNL_NAV: NavItem[] = [
  { href: "/gnl/schedule", label: "Schedule" },
  { href: "/gnl/standings", label: "Standings" },
  { href: "/gnl/teams", label: "Teams" },
  { href: "/gnl/leaderboard", label: "Leaderboard" },
  { href: "/gnl/fantasy", label: "Fantasy" },
  { href: "/gnl/rules", label: "Rules" },
  { href: "/gnl/about", label: "About" },
];
