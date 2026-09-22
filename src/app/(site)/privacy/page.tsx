import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { DISCORD_URL, GITHUB_ISSUES_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What the Warcraft 3 Gym site collects and why: anonymous page analytics, build orders you submit, and league data from public sources. No accounts, no cookies, no advertising.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    title: "Anonymous analytics",
    points: [
      "We use Vercel Analytics and Vercel Speed Insights to count page views and measure how fast pages load.",
      "They set no cookies, store no personal data, and do not keep your IP address. Visits are counted per page, not per person, and cannot be tied to you.",
      "There is no consent banner because there is nothing to consent to. If you block the script, the site works exactly the same.",
    ],
  },
  {
    title: "Build orders you submit",
    points: [
      "When you submit a build order, the site stores what you type in the form: the build itself, the name you want shown as the author, and your Discord handle if you add one.",
      "Submissions go into the site's content system as drafts and are reviewed by a coach before they are published. The author name appears on the published build; the Discord handle is only used to contact you about it.",
      "To edit or remove a build you submitted, ask on the Gym Discord and we will take care of it.",
    ],
  },
  {
    title: "Replay import",
    points: [
      "The replay import parses an uploaded .w3g file on the server to draft a build order, then discards it. Replays are not stored and not shared.",
      "Importing from a W3Champions match link reads that match from W3Champions' public API in the same way.",
    ],
  },
  {
    title: "League and player data",
    points: [
      "Standings, schedules, teams and results come from the Gym's own league backend.",
      "Ladder stats and match histories come from W3Champions' public API and are shown as W3Champions publishes them. Battle.net tags shown on the site are the ones players compete under.",
      "If you play in the Gym Newbie League and want your details changed, contact an admin on Discord.",
    ],
  },
  {
    title: "What we do not do",
    points: [
      "No user accounts, no logins, no passwords.",
      "No advertising, no ad networks, no tracking pixels, no data sold or shared with third parties.",
      "No cookies set by this site. The build editor remembers your recently used icons in your own browser storage, which never leaves your device.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        kicker="The short version"
        title="Privacy"
        lead="This is a community site run by volunteers. It collects as little as possible, and this page lists all of it."
      />
      <Container className="max-w-3xl space-y-4 py-10">
        {SECTIONS.map((s) => (
          <Surface key={s.title} className="p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold uppercase">{s.title}</h2>
            <ul className="mt-4 space-y-3">
              {s.points.map((p) => (
                <li key={p} className="flex gap-3 text-muted">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rotate-45 bg-gold" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Surface>
        ))}
        <p className="pt-2 text-sm text-faint">
          Questions or a request about your data? Ask on the{" "}
          <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-4 hover:text-gold">
            Gym Discord
          </a>{" "}
          or{" "}
          <a href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-4 hover:text-gold">
            open an issue on GitHub
          </a>
          . The site is open source, so you can read exactly what it does. Back to{" "}
          <Link href="/" className="text-muted underline underline-offset-4 hover:text-gold">
            the home page
          </Link>
          .
        </p>
      </Container>
    </>
  );
}
