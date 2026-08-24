import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="kicker mb-4">Error 404</p>
      <h1 className="text-[length:var(--wg-text-hero)] font-extrabold leading-none text-gold">
        404
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted">
        This page has been creep-jacked. It&apos;s not on the map.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/" size="lg">
          Back to base
        </ButtonLink>
        <ButtonLink href="/standings" variant="outline" size="lg">
          View standings
        </ButtonLink>
      </div>
    </Container>
  );
}
