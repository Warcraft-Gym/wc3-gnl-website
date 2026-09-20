import { Wordmark } from "./Wordmark";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { ButtonLink } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_URL } from "@/lib/links";

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
        <div className="flex items-center gap-2 sm:gap-3">
          {/* The Discord CTA stays visible at every width: a full button on
              desktop, an icon-only one next to the menu on phones */}
          <ButtonLink
            href={DISCORD_URL}
            variant="discord"
            size="sm"
            target="_blank"
            rel="noreferrer"
            aria-label="Join the Discord"
            className="max-md:size-10 max-md:px-0 max-sm:w-10"
          >
            <DiscordIcon size={16} />
            <span className="max-md:sr-only">Join Discord</span>
          </ButtonLink>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
