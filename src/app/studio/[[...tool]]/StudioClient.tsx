"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

/** Keeps `sanity` inside the client boundary so it never enters the RSC server
 *  graph (avoids the swr `react-server` default-export build error). */
export function StudioClient() {
  return <NextStudio config={config} />;
}
