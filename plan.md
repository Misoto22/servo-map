# ServoMap — Australian Fuel Price Map

> Real-time fuel prices across Australia, on a map.

**Domain (pending):** `servo-map.com`
**Repo:** `servo-map`

"Servo" is Australian slang for a petrol station — short, local, memorable.

---

## Goals

- Interactive map showing fuel prices at every station across Australia
- SEO-optimised suburb pages that rank for queries like "cheapest petrol burwood"
- Aggregate all state government fuel APIs into one unified source
- Fast, free, no ads

---

## Data sources

Australia has no national fuel price API. Each state runs its own mandatory reporting scheme with different formats, auth, and update cadences.

| State/Territory | Source | Format | Auth | Update frequency |
|-----------------|--------|--------|------|------------------|
| NSW + TAS + ACT | NSW FuelCheck API v2 (`api.nsw.gov.au`) | REST JSON | API key (free) | Near real-time |
| QLD | Fuel Prices QLD (`fuelpricesqld.com.au`) | REST JSON | Token (free) | Near real-time |
| VIC | Service Victoria Servo Saver API | REST JSON | Consumer ID (application) | 24-hour delay |
| WA | FuelWatch (`fuelwatch.wa.gov.au`) | XML/RSS | Public | Daily (next-day prices at 2:30pm) |
| SA | Informed Sources (SA scheme) | REST JSON | Registration | Near real-time |
| NT | No mandatory scheme | — | — | Not covered |

All data is normalised into a unified `Station` schema (id, name, brand, address, suburb, state, lat/lng, prices by fuel type, timestamp) and cached in Cloudflare KV. Cron runs every 15 minutes.

---

## Tech stack

**Frontend:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Mapbox GL JS (client-only via `next/dynamic`)

**Backend:** Cloudflare Worker · Cloudflare KV (cache) · Cron Triggers (15 min interval)

**Deployment:** Vercel (frontend) · Cloudflare (backend + cache)

**Cost at launch:** $0/month (all within free tiers)

---

## Architecture

- **CF Worker** pulls all state APIs on a 15-min cron, normalises data, writes to KV. Exposes a REST API (`/api/v1/stations`) that reads from KV and supports filtering by location, fuel type, brand, and radius.

- **Next.js** serves two layers:
  - **SSG/ISR pages** (for SEO): `/fuel/[state]/[suburb]` and `/station/[id]` pages with price tables, JSON-LD structured data, and meta tags. Revalidates every 15 minutes.
  - **Client-side interactive map** (for users): Mapbox GL with clustered markers, geolocation, filters, and sort by price/distance.

---

## SEO approach

- ISR suburb pages targeting "cheapest petrol {suburb}" queries
- JSON-LD `GasStation` schema on every station page
- Dynamic sitemap generation
- OG images per suburb

---

## Key decisions

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 | SSG/ISR for SEO + familiar stack |
| Map | Mapbox GL JS | Best free tier + visual quality + clustering |
| Backend | CF Worker + KV | Built-in cron, free caching, zero server management |
| Styling | Tailwind CSS | Lightweight for a map-first UI |
| Package manager | pnpm workspaces | Fast, good monorepo support |

---

## Roadmap

**Phase 1 — MVP:** NSW + QLD adapters, CF Worker, map with markers, geolocation, deploy.

**Phase 2 — SEO + coverage:** Add WA adapter, ISR suburb/station pages, JSON-LD, sitemap. Apply for VIC/SA API access.

**Phase 3 — Polish:** Filters, clustering, mobile layout, PWA, price trend charts.

**Phase 4 — Growth:** VIC + SA adapters, price alerts, route planner, i18n.

---

## Risks

| Risk | Mitigation |
|------|------------|
| VIC data has 24hr delay | Show "last updated" prominently |
| SA/VIC API approval may take weeks | Launch with NSW + QLD + WA first |
| State APIs change without notice | Error monitoring per adapter; serve cached data on failure |
| Mapbox free tier (50k loads/mo) | Monitor; fall back to MapLibre GL if needed |

---

## References

- [NSW FuelCheck API](https://api.nsw.gov.au/Product/Index/22)
- [QLD Fuel Price Reporting](https://www.data.qld.gov.au/dataset/fuel-price-reporting-2025)
- [VIC Servo Saver API](https://service.vic.gov.au/find-services/transport-and-driving/servo-saver/help-centre/servo-saver-public-api)
- [WA FuelWatch](https://www.fuelwatch.wa.gov.au)
- [SA Fuel Pricing Scheme](https://www.sa.gov.au/topics/driving-and-transport/fuel-pricing/fuel-price-reporting)
