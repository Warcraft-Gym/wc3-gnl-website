import { Trophy } from "lucide-react";

// The rule glyphs in public/achievementIcons, named after their rule id; copied from wc3-gym-frontend, keep the two in step
const GLYPHS = new Set(
  `addicted always_here anti_random bragging_rights captains_duty civil_war climber comeback dats_fakt_ap
   double_up duck_hunting early_bird elite every_week everyone_hunts everyone_scores falling_star fast_start
   fifty_faces first_to_fifty five_a_day four_horsemen full_roster games_100 games_25 games_50 grand_tour
   half_regular hat_trick hold_the_line holiday home_turf human hunting_season i_am_the_captain_now join_them
   ladder_goal last_call lose_first map_win marathon mirror_master month_of_sundays nemesis never_blank
   never_gone newbie night_elf nobody_left off_duty one_sitting open_season orc plus_twenty power_hour
   race_tour repeat_offender revenge rising_star rival sad_trombone slayer_hu slayer_ne slayer_oc slayer_ud
   sparring_partners speedrunner streak_week team_climb team_goal team_grand_tour team_map_coverage
   team_night team_race_coverage tourist twenty_days twenty_hours two_hundred undead week_one
   weekend_warrior weekly_regular welcome_back wide_net win_every_map win_first win_pool win_streak
   win_streak_2 winner_winner winter`.split(/\s+/),
);

/** One badge glyph from game-icons.net, tinted by the surrounding text color; a trophy for an unknown rule */
export function AchievementIcon({ id, size = 20 }: { id: string; size?: number }) {
  // ponytail: a `map_win:<map>` badge shows the map_win glyph, not the map picture the app shows
  const rule = id.split(":")[0];
  const glyph = GLYPHS.has(id) ? id : GLYPHS.has(rule) ? rule : null;
  if (!glyph) return <Trophy size={size} />;
  // The glyph is a single currentColor path, so a mask paints it in the surrounding text color
  const mask = `url(/achievementIcons/${glyph}.svg) center / contain no-repeat`;
  return <span role="img" aria-label={id} className="inline-flex shrink-0 bg-current" style={{ width: size, height: size, mask, WebkitMask: mask }} />;
}
