import { notFound, redirect } from "next/navigation";
import { getSeason, getSeasons } from "@/lib/api/gnl";
import { parseSeasonParam, withSeason, type SeasonSearchParams } from "@/lib/api/season-params";

export default async function ScheduleIndex({ searchParams }: { searchParams: Promise<SeasonSearchParams> }) {
  const requested = parseSeasonParam((await searchParams).season);
  const [seasons, season] = await Promise.all([getSeasons(), getSeason(requested)]);
  if (!season) notFound();
  // The newest season is the default, so its link carries no param.
  const param = season.number === seasons[0]?.number ? undefined : season.number;
  redirect(withSeason(`/gnl/schedule/${season.currentWeek}`, param));
}
