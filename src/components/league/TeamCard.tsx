import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Team } from "@/lib/api/types";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { TeamPlate } from "./VsBadge";
import { cn, raceOf } from "@/lib/utils";
import { CaptainBadge } from "./CaptainBadge";

export function TeamCard({ team }: { team: Team }) {
  return (
    <Surface interactive as="article" className="group flex flex-col p-5">
      <Link
        href={`/gnl/teams/${team.slug}`}
        className="flex items-start justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <TeamPlate
            tag={team.tag!}
            logoUrl={team.logoUrl}
            name={team.name}
            size="lg"
          />
          <div>
            <h3 className="font-display text-lg font-bold uppercase leading-tight text-fg transition-colors group-hover:text-gold">
              {team.name}
            </h3>
            <p className="mt-0.5 text-xs text-faint">
              {team.players.length} players
              {team.captains.length ? (
                <>
                  {" · "}
                  <span className="text-muted">
                    {team.captains.length > 1 ? "Captains" : "Captain"}{" "}
                    {team.captains.map((c) => c.name).join(" & ")}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <ArrowUpRight
          size={18}
          className="text-faint transition-colors group-hover:text-gold"
        />
      </Link>

      <ul className="mt-4 flex flex-col gap-2 border-t border-line/60 pt-4">
        {team.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 text-muted">
              <RaceBadge race={raceOf(p.race)} showLabel={false} />
              <span className={cn("truncate", p.isCaptain && "text-fg")}>{p.name}</span>
              {p.isCaptain ? <CaptainBadge compact /> : null}
            </span>
            <span className="tnum shrink-0 text-xs text-faint" title="W3Champions MMR">
              {p.mmr ?? "-"}
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
