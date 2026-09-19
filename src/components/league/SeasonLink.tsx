"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { withSeason } from "@/lib/api/season-params";

type Props = React.ComponentProps<typeof Link> & { href: string };

function SeasonAwareLink({ href, ...rest }: Props) {
  const season = useSearchParams().get("season");
  const n = Number(season);
  return <Link href={withSeason(href, season && Number.isInteger(n) && n > 0 ? n : undefined)} {...rest} />;
}

/** A link between league pages that keeps the `?season=` being browsed, so
 *  moving from a past season's standings to a team stays in that season.
 *  Renders a plain link while the search params are not available yet. */
export function SeasonLink(props: Props) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <SeasonAwareLink {...props} />
    </Suspense>
  );
}
