import Link from "next/link";
import type { Team } from "@/lib/api/types";

/** Circular team crests in a row, like the race medallions on the official
 *  site. Falls back to the team tag when there is no logo. */
export function TeamMedallions({ teams }: { teams: Team[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-7 sm:gap-x-7">
      {teams.map((t) => (
        <li key={t.id} className="w-[5.5rem] sm:w-24">
          <Link
            href={`/gnl/teams/${t.slug}`}
            className="group flex flex-col items-center text-center"
          >
            <span className="grid size-[5.5rem] place-items-center rounded-full border-2 border-gold-deep/70 bg-surface/80 p-1 shadow-[0_0_0_4px_rgba(0,0,0,.6),0_12px_30px_-10px_rgba(0,0,0,.9)] transition-[border-color,box-shadow,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:-translate-y-1 group-hover:border-gold group-hover:shadow-[0_0_0_4px_rgba(0,0,0,.6),0_0_34px_-6px_var(--wg-gold-glow)] sm:size-24">
              <span className="grid size-full place-items-center overflow-hidden rounded-full border border-line-strong bg-surface-2">
                {t.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.logoUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-contain p-2"
                  />
                ) : (
                  <span className="font-display text-base font-bold text-gold">
                    {t.tag}
                  </span>
                )}
              </span>
            </span>
            <span className="mt-3 line-clamp-2 font-display text-[0.68rem] font-bold uppercase leading-tight tracking-[0.1em] text-muted transition-colors group-hover:text-fg">
              {t.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
