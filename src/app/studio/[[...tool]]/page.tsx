/**
 * Embedded Sanity Studio, served at /studio. Outside the (site) route group,
 * so it renders full-screen without the marketing header/footer. The Studio
 * itself lives in a client component (StudioClient) so `sanity` stays out of
 * the RSC server graph.
 */
import type { Metadata, Viewport } from "next";
import { StudioClient } from "./StudioClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function StudioPage() {
  return <StudioClient />;
}
