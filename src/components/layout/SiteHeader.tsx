import { Wordmark } from "./Wordmark";
import { DesktopNav } from "./DesktopNav";
import { MobileNav } from "./MobileNav";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-bg-deep/80 backdrop-blur-lg [--header-h:64px]">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Wordmark />
        <div className="flex items-center gap-3">
          <DesktopNav />
          <div className="hidden md:block">
            <ButtonLink href="/dashboard" variant="outline" size="sm">
              Player Dashboard
            </ButtonLink>
          </div>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
