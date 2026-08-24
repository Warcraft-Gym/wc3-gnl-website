import { redirect } from "next/navigation";
import { getActiveSeason } from "@/lib/api/gnl";

export default async function ScheduleIndex() {
  const season = await getActiveSeason();
  redirect(`/gnl/schedule/${season.currentWeek}`);
}
