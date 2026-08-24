import type { Post } from "./types";

export const FIXTURE_POSTS: Post[] = [
  {
    slug: "season-12-playoffs-preview",
    title: "Season 12 Playoffs: Naxxramas favoured, but the bracket is wide open",
    excerpt:
      "Eight teams, one trophy. We break down the quarterfinal matchups, the storylines, and the dark horses who could crash the party.",
    category: "recap",
    author: "The Gym Desk",
    publishedAt: "2026-08-20T09:00:00.000Z",
    readingMinutes: 6,
    paragraphs: [
      "Season 12 has been the most competitive in Gym Newbie League history. With the regular season behind us, eight teams now turn their attention to a single-elimination bracket where a single cold series ends your run.",
      "Naxxramas enter as the clear favourites after a 6–1 campaign and a map differential no one else came close to. ColdLogic's undead has been the story of the split — surgical creep routing, patient expansions, and a late-game that simply does not crack.",
      "But brackets are cruel. Durotar Raiders match them on record and bring the tournament's most aggressive early game. If GrommDrip lands even one fast expansion punish, the whole seeding math changes.",
      "Keep an eye on Ashenvale Wardens as the dark horse. Moonfang's night elf is unpredictable in the best way, and a hot Bo5 from the three-seed is exactly how these things get flipped.",
    ],
  },
  {
    slug: "how-scheduling-works-now",
    title: "Scheduling your matches just got a whole lot easier",
    excerpt:
      "The new player dashboard lets you set availability and lock in series times without pinging a single admin. Here's how it works.",
    category: "announcement",
    author: "Gym Staff",
    publishedAt: "2026-08-14T15:30:00.000Z",
    readingMinutes: 3,
    paragraphs: [
      "For years, scheduling a GNL series meant a tangle of Discord DMs and spreadsheet tabs. That era is over.",
      "Log in through the player dashboard, set the windows you're available, and the system proposes times that work for both players. Confirm, and it's on the calendar — synced straight to the public schedule.",
      "Reporting results is just as quick: drop your replays, enter the score, and standings update automatically. Admins only step in when something needs a ruling.",
    ],
  },
  {
    slug: "newbie-guide-first-season",
    title: "New to the Gym? Everything you need for your first season",
    excerpt:
      "The Gym Newbie League is designed for improving players. Here's how signups, races, and the ladder actually work.",
    category: "guide",
    author: "The Gym Desk",
    publishedAt: "2026-08-05T12:00:00.000Z",
    readingMinutes: 5,
    paragraphs: [
      "The whole point of the Gym is to get better at Warcraft III in a structured, friendly, competitive environment. You do not need to be good. You need to be willing to play and learn.",
      "Signups run through our Discord bot, which issues you a one-time link to create your profile — pick your race, set your battle tag, and you're in the pool for the next draft.",
      "From there, teams draft rosters, series get scheduled, and every game you play feeds your stats. Win or lose, you'll have replays to review and a community ready to help you improve.",
    ],
  },
];
