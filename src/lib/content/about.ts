/**
 * About-page content for /gnl/about. The league format changes rarely, so
 * this lives in code rather than in the Studio.
 */

export type AboutBenefit = { title: string; body: string };
export type AboutStep = { title: string; body: string };

export type AboutContent = {
  kicker: string;
  title: string;
  lead: string;
  intro: string[];
  benefits: AboutBenefit[];
  steps: AboutStep[];
  cadence: string[];
};

export const ABOUT: AboutContent = {
  kicker: "Gym Newbie League",
  title: "About the GNL",
  lead: "A team league with solo matches, created by the Gym Discord community to give new and veteran players a competitive (and fun) place to compete.",
  intro: [
    "The GNL is built for players between the grass/beginner leagues and roughly 1700–1800 MMR: anyone who wants organised, competitive games without stepping into the pro scene. If you're friendly, active in game and on Discord, there's a spot for you.",
    "Skill level does not matter. Showing up and wanting to improve does.",
  ],
  benefits: [
    {
      title: "Matched competition",
      body: "Captains draft balanced rosters so you're paired against opponents at your tier. Every week you get a competitive best-of-three that actually feels fair.",
    },
    {
      title: "Captains & coaches",
      body: "Your captains and coaches are helpful people from the community, from seasoned veterans to semi-pros, who draft the team, share strategy, and help you improve.",
    },
    {
      title: "A team behind you",
      body: "Private team Discord channels for strategy talk, replay reviews, and camaraderie. You're never grinding alone, you've got a squad.",
    },
  ],
  steps: [
    {
      title: "Sign up",
      body: "Apply to join the season through the Gym Discord. Everyone is welcome. Skill level does not matter.",
    },
    {
      title: "Get drafted",
      body: "Captains pick their rosters, building teams of players at a similar level.",
    },
    {
      title: "Train with your team",
      body: "Practice, review replays, and prep with your captain and teammates before the season starts.",
    },
    {
      title: "Play your weekly match",
      body: "Each week your team faces another team in a series of solo best-of-three matches.",
    },
    {
      title: "Earn points",
      body: "Results feed the standings: 4 points for a 2–0, 3 for a 2–1, and 1 even for a 1–2 loss.",
    },
    {
      title: "Improve, win or lose",
      body: "Every game gives you replays to study and teammates to learn from. Getting better is the whole point.",
    },
  ],
  cadence: [
    "A season runs roughly six weeks, with a break of a few months between cycles. Between seasons the Gym Discord keeps going, volunteer coaching, practice, and a community of Warcraft III players to game with while you wait for the next draft.",
  ],
};
