import { Wordmark } from "./Wordmark";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { ButtonLink } from "@/components/ui/Button";
import { DASHBOARD_URL } from "@/lib/links";

/** Floating translucent nav bar, inset from the viewport edges like the
 *  official site. Height is published as --wg-header-h for sticky offsets. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto flex h-[60px] max-w-[84rem] items-center justify-between gap-4 rounded-lg border border-line bg-surface/80 px-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl sm:h-[64px] sm:px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Wordmark />
          <span aria-hidden className="hidden h-7 w-px bg-line-strong md:block" />
          <DesktopNav />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <ButtonLink href={DASHBOARD_URL} size="sm" target="_blank" rel="noreferrer">
              Player Dashboard
            </ButtonLink>
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
