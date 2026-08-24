import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";

export const metadata: Metadata = {
  title: "Rules & Format",
  description: "How the GNL season, drafts, and playoffs work.",
};

const SECTIONS = [
  {
    title: "Season format",
    points: [
      "Teams are drafted at the start of each season from the signed-up player pool.",
      "The regular season runs in weekly team fixtures; each fixture is a set of head-to-head best-of-three games.",
      "Scoring: 4 points for a 2–0, 3 for a 2–1, and 1 even for a 1–2 loss. The table is ordered by points, then map differential.",
    ],
  },
  {
    title: "Scheduling",
    points: [
      "Players set their availability and agree a time through the dashboard.",
      "Unscheduled games default to the league's standard slot for that week.",
      "Both players confirm the result; admins only step in for disputes.",
    ],
  },
  {
    title: "Playoffs",
    points: [
      "The top four teams advance to a single-elimination bracket.",
      "Higher seeds are placed on the home side of the bracket.",
      "The Grand Final is a best-of-five between the two surviving teams.",
    ],
  },
];

export default function RulesPage() {
  return (
    <>
      <PageHeader
        kicker="GNL 18 · How it works"
        title="Rules & Format"
        lead="The short version of how a GNL season runs, start to finish."
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
      </Container>
    </>
  );
}
