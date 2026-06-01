# Conventions

> Last reviewed: 2026-04-22

## TypeScript

- `tsconfig.base.json` is strict. Do not loosen per package.
- `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`.
- Prefer `type` imports when importing only types: `import type { Station } from "@servo-map/shared"`.
- No `any` without justification. Use `unknown` + narrow at boundaries.
- Exported functions get explicit return types.

## File layout

- **One concept per file.** If you find yourself writing a second unrelated class/function in a file, split it.
- Folder index files (`index.ts`) only re-export; no logic inside.
- Worker source tree mirrors request → storage flow:
  ```
  packages/worker/src/
    index.ts         # Hono entry, CORS, route mounting
    env.ts           # Env bindings + secrets type
    routes/          # HTTP handlers (one file per resource)
    adapters/        # State adapters + their raw response types
    kv/              # keys.ts (central), read.ts, write.ts
    cron/            # scheduled handler
    utils/           # geo, fuel-map, date helpers
  ```
- Web source tree:
  ```
  packages/web/src/
    app/             # Next.js App Router
    components/      # React components grouped by feature (map/, search/, filters/, stations/, layout/)
    hooks/           # Client hooks (useGeolocation, useStations)
    lib/             # api.ts (HTTP client), utils.ts
    providers/       # Context providers (ThemeProvider)
  ```

## Naming

- **Files:** kebab-case (`fuel-map.ts`, `use-stations.ts` — except React hooks which stay camelCase per JS convention: `useStations.ts`, `useGeolocation.ts`).
- **Types / interfaces:** PascalCase (`Station`, `NswPricesResponse`).
- **Values / functions:** camelCase.
- **Constants that are enum-like:** SCREAMING_SNAKE with `as const` (e.g. `FUEL_TYPES`, `KV_KEYS`).
- **Station IDs:** `"{state}-{source_id}"` (see `packages/worker/src/adapters/nsw.ts:150`).
- **KV keys:** never inline strings. Always via `KV_KEYS.*` in `packages/worker/src/kv/keys.ts`.

## JSON field naming

The REST API uses **snake_case** for payload fields (`last_updated`, `station_count`, `updated_at`). This matches `packages/shared/src/types.ts` and is contract with the frontend. When a raw upstream API uses different casing (QLD returns `Lt`, `Ln`; NSW returns `lastupdated`), normalise inside the adapter — never leak raw shapes to the API or the web.

## Imports

Order (enforced manually until ESLint does it):

1. Node/runtime stdlib
2. Third-party packages (`hono`, `next`, `react`)
3. `@servo-map/shared`
4. Relative imports (`../`, `./`)

Use the `@/*` alias in web (`packages/web/tsconfig.json`), not deep relative paths (`../../../lib/api`).

## Comments

- Explain **why**, not what.
- English only for new comments. Existing Chinese comments are fine to keep; do not mass-translate them in unrelated PRs.
- Public functions exported from `@servo-map/shared` get a one-line doc comment.

## Error handling

### Worker (Hono routes)

- Validate query params at the top of the handler. Return `400` with `{ status: "error", message, code }` on bad input (see `packages/worker/src/routes/stations.ts` for the in-use codes: `INVALID_STATE`, `INVALID_FUEL`, `INVALID_GEO`, `STATION_NOT_FOUND`).
- Do not throw from routes in response to user input.
- Upstream / KV failures are allowed to throw — let the global Hono error handler return 500. Do not leak internal messages to the client.

### Adapters

- Throw on upstream HTTP failure with a descriptive message including the state code and status.
- The ingest caller (`scripts/fetch-data.ts`) runs adapters under `Promise.allSettled` — a single throw must not poison the cycle.

### Web

- `packages/web/src/lib/api.ts` throws on non-2xx. Call sites must handle the error (usually via the hook's error state).

## React / Next.js

- Server components by default. Add `"use client"` only when needed (Mapbox, hooks, browser APIs).
- Data fetching for SEO pages happens in the Server Component (`generateStaticParams`, `fetch` with revalidate).
- Do **not** import `mapbox-gl` from a server module — it must be loaded inside a client component (and ideally via `next/dynamic` with `ssr: false`).
- Use the alias `@/` (`packages/web/tsconfig.json`).

## Hono

- Mount resource routers via `app.route("/resource", resourceRoute)`. One router per file under `routes/`.
- Use `c.req.query()` once and destructure; don't call it repeatedly per param.
- Return JSON with `c.json(...)`; let Hono set `Content-Type`.
- CORS is applied globally at the root (`index.ts`). Do not re-apply per route.

## Linting / formatting

- `packages/web`: ESLint 9 flat config, `eslint-config-next`. Run `pnpm --filter @servo-map/web lint`.
- `packages/worker`: ESLint 9 flat config with `typescript-eslint`. Run `pnpm --filter @servo-map/worker lint`.
- `packages/shared`: no linter (pure types). `typecheck` is the gate.
- No Prettier configured; respect the implicit style (2-space indent, double quotes, semicolons).
