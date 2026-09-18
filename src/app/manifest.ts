import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "WC3 Gym",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0b0a09",
    theme_color: "#0b0a09",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
