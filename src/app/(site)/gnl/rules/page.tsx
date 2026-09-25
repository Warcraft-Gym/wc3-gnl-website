import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { PortableBody } from "@/components/sanity/PortableBody";
import { FALLBACK_RULES, getGnlRules } from "@/lib/gnl/rules";

export const metadata: Metadata = {
  title: "GNL rules and format",
  description: "How a Gym Newbie League season works: sign-ups, the draft, weekly best-of-three series, points and playoffs.",
  alternates: { canonical: "/gnl/rules" },
};


/** Same wording as the date on a creep route: a plain, unambiguous day. */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function RulesPage() {
  // Edited in the Studio; the built-in copy is the fallback, so an empty CMS
  // still renders a rulebook rather than an empty page.
  const rules = await getGnlRules();

  return (
    <>
      <PageHeader
        kicker="GNL 18 · How it works"
        title="Rules & Format"
        lead="The short version of how a GNL season runs, start to finish."
      />
      <Container className="max-w-3xl space-y-4 py-10">
        {rules ? (
          <Surface className="p-6 sm:p-8">
            {rules.intro ? <p className="mb-6 text-muted">{rules.intro}</p> : null}
            <div className="prose-invert max-w-none">
              <PortableBody value={rules.body as never} />
            </div>
            {rules.updatedAt ? (
              <p className="mt-6 text-xs text-faint">Rules last changed {formatDate(rules.updatedAt)}</p>
            ) : null}
          </Surface>
        ) : (
          FALLBACK_RULES.map((s) => (
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
          ))
        )}
      </Container>
    </>
  );
}
