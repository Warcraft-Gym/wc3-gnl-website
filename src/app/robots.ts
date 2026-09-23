import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The CMS, the API and both submission forms are not for search
        // engines. `/learn/creep-routes/submit` was missing, so the creep
        // route editor was crawlable.
        disallow: ["/studio", "/api/", "/learn/builds/submit", "/learn/creep-routes/submit"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
