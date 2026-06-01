import type { MetadataRoute } from "next";
import { getStations } from "@/lib/api";

const BASE = "https://servo-map.com";
const LIVE_STATES = ["nsw", "qld"] as const;
// Per-state fetch cap (worker MAX_LIMIT). Large states are NOT fully enumerated
// here — a dedicated suburb-index endpoint should replace this before launch so
// the sitemap doesn't silently miss stations/suburbs beyond the first 500.
const PER_STATE_LIMIT = 500;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "hourly", priority: 1 },
  ];

  const suburbSlugs = new Set<string>();
  for (const state of LIVE_STATES) {
    try {
      const { data } = await getStations({ state, limit: PER_STATE_LIMIT });
      for (const s of data) {
        const slug = s.suburb.toLowerCase().trim().replace(/\s+/g, "-");
        if (slug) suburbSlugs.add(`${s.state}/${slug}`);
        entries.push({
          url: `${BASE}/station/${s.id}`,
          lastModified: now,
          changeFrequency: "hourly",
          priority: 0.5,
        });
      }
    } catch {
      // API unreachable — skip this state, keep the static + already-collected routes.
    }
  }

  for (const path of suburbSlugs) {
    entries.push({
      url: `${BASE}/fuel/${path}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7,
    });
  }

  return entries;
}
