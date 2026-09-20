import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { BuildSubmitForm } from "@/components/builds/BuildSubmitForm";

export const metadata: Metadata = {
  title: "Submit a build order",
  description: "Share a Warcraft III build order with the Gym. A coach reviews it and publishes it with your name on it.",
  robots: { index: false },
};

export default function SubmitBuildPage() {
  return (
    <>
      <PageHeader
        kicker="Learn · Build orders"
        title="Submit a build"
        art="/graphics/build-orders-2.webp"
        lead="Share a build order that works for you. A coach reviews it, then it goes up in the build list with your name on it."
      >
      </PageHeader>
      <Container className="max-w-4xl py-10">
        <BuildSubmitForm />
      </Container>
    </>
  );
}
