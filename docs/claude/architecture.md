# Architecture

> Last reviewed: 2026-04-22

## Package boundaries

```
┌──────────────────────┐          ┌──────────────────────┐
│  State fuel APIs     │          │   Browser (user)     │
│  (NSW, QLD, ...)     │          │                      │
└──────────┬───────────┘          └──────────┬───────────┘
           │                                 │
           │ HTTPS                           │ HTTPS
           ▼                                 ▼
┌──────────────────────┐          ┌──────────────────────┐
│  Ingest path         │          │  Read path           │
│  scripts/fetch-data  │          │  CF Worker (Hono)    │
│  (GH Actions cron,   │          │  api.servo-map.com   │
│   every 15 min)      │          │                      │
└──────────┬───────────┘          └──────────┬───────────┘
           │ KV REST API                     │ KV binding
           ▼                                 ▼
          ┌───────────────────────────────────────┐
          │  Cloudflare KV (namespace: servo-map) │
          └───────────────────────────────────────┘
                            ▲
                            │ fetch() via NEXT_PUBLIC_API_URL
                            │
          ┌───────────────────────────────────────┐
          │  Next.js (Vercel)                     │
          │  - App Router pages (SSR/ISR)         │
          │  - Mapbox GL (client-only)            │
          │  - /fuel/[state]/[suburb], /station/[id] │
          └───────────────────────────────────────┘
```

## Two runtimes, one contract

There are **two callers that write KV**:

1. **`scripts/fetch-data.ts`** — Node script run by GitHub Actions every 15 minutes. It imports adapters via dynamic path, calls each, and writes to KV using the Cloudflare REST API.
2. **`packages/worker/src/cron/handler.ts`** — the Worker's built-in scheduled handler. It uses the native KV binding. Present for future migration; **not wired as the active ingest today**.

Both paths share the same `StateAdapter` contract and produce identical `Station[]` output. Do not let them diverge.

The Hono Worker is **read-only** in steady state — it serves `/api/v1/*` from KV.

## Shared types

`@servo-map/shared` is a TypeScript-only package. It compiles to `dist/` and both `web` and `worker` depend on it via `workspace:*`.

Authoritative exports (`packages/shared/src/index.ts`):

- `FUEL_TYPES`, `FuelType` — `"U91" | "U95" | "U98" | "E10" | "Diesel"`
- `AUSTRALIAN_STATES`, `AustralianState` — `"nsw" | "qld" | "vic" | "wa" | "sa" | "tas" | "act" | "nt"`
- `Station`, `FuelPrice`, `StationWithDistance`
- `PaginationMeta`, `StateMetadata`
- `ApiResponse<T>`, `ApiErrorResponse`

**Build order matters.** `pnpm --filter @servo-map/shared build` must run before `typecheck`/`build` of the other packages in CI (see `.github/workflows/ci.yml`).

## KV schema

Defined in `packages/worker/src/kv/keys.ts`:

| Key                       | Type                                       | Writer                         | Reader                                    |
|---------------------------|--------------------------------------------|--------------------------------|-------------------------------------------|
| `stations:<state>`        | `Station[]` (JSON)                         | ingest                         | `/api/v1/stations`                        |
| `station:<id>`            | `Station` (JSON)                           | ingest (per station)           | `/api/v1/stations/:id`                    |
| `brands`                  | `string[]` (JSON, sorted unique)           | ingest                         | `/api/v1/brands`                          |
| `metadata`                | `Record<AustralianState, StateMetadata>`   | ingest (merged)                | `/api/v1/metadata`                        |
| `ref:<state>`             | adapter-defined, TTL-bounded               | optional adapter cache         | optional adapter cache                    |

**Rules:**

- `metadata` is **merged** with the previous value (`writeMetadata`) so a state that failed to fetch keeps its last-good timestamp.
- `ref:<state>` entries must be written with `expirationTtl` (seconds).
- Never list-scan KV in a hot path. All reads are direct key gets.

## Request pipeline (read path)

```
Browser → GET /api/v1/stations?state=nsw&fuel=U91&sort=price_asc
  → Hono route (packages/worker/src/routes/stations.ts)
  → Validate params (AUSTRALIAN_STATES / FUEL_TYPES allowlist)
  → readStationsByState(kv, state) for each requested state  (Promise.all)
  → Filter in memory: brand, fuel, q, suburb, postcode, radius
  → Compute distance (haversine) when lat/lng supplied
  → Sort by distance OR price (requires fuel param)
  → Paginate (limit default 100, max 500)
  → Return { status: "success", data, meta }
```

Limits: `DEFAULT_LIMIT = 100`, `MAX_LIMIT = 500`. If you change them, update `docs/openapi.yaml`.

## Ingest pipeline (write path)

```
GH Actions cron (every 15 min)
  → scripts/fetch-data.ts
  → for each adapter: adapter.fetchStations(env)   (Promise.allSettled)
  → groupByState(all stations)
  → for each state with data:
       writeStations(kv, state, stations)
       metadata[state] = { last_updated, station_count }
  → writeBrands(kv, uniqueSortedBrands)
  → writeMetadata(kv, metadataUpdates)  (merged)
```

A single adapter failure is logged but does not abort the cycle — the remaining states still update.

## Frontend topology

- `packages/web/src/app/layout.tsx` — root layout, fonts, `<ThemeProvider>`, `<Analytics />`.
- `packages/web/src/app/page.tsx` — landing / map.
- `packages/web/src/app/fuel/[state]/[suburb]/` — SEO suburb pages (ISR).
- `packages/web/src/app/station/[id]/` — per-station page.
- `packages/web/src/lib/api.ts` — the **only** place the web talks to the Worker. All fetches go through `getStations`, `getStation`, `getBrands`.
- `packages/web/src/hooks/useStations.ts` — client-side station state.
- `packages/web/src/components/map/` — Mapbox wrapper. Must remain client-side (`"use client"` + `next/dynamic` where needed).
