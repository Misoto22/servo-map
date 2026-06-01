# REST API

> Last reviewed: 2026-04-22
> Source of truth: [`docs/openapi.yaml`](../openapi.yaml). This doc explains conventions and how to change the contract safely.

## Base

- Production: `https://api.servo-map.com`
- Local dev: `http://localhost:8787` (wrangler)
- Path prefix: `/api/v1`
- CORS: wide open (`hono/cors` with defaults). Tighten before launch.

## Response envelope

ServoMap uses a lightweight status envelope — **not** RFC 9457 (user's general API-design rule allows per-project overrides; this project's existing contract wins).

### Success

```json
{
  "status": "success",
  "data": <T>,
  "meta": { "total": 1234, "limit": 100, "offset": 0 }   // list endpoints only
}
```

- `data` is the resource (object for single, array for list).
- `meta` is present only for paginated list responses.
- No envelope wrapping for top-level arrays inside `data` — `data` **is** the array.

### Error

```json
{
  "status": "error",
  "message": "Human-readable explanation",
  "code": "INVALID_STATE"
}
```

Active error codes (see `packages/worker/src/routes/stations.ts`):

| Code                 | HTTP | When                                         |
|----------------------|------|----------------------------------------------|
| `INVALID_STATE`      | 400  | `state` query param not in `AUSTRALIAN_STATES` |
| `INVALID_FUEL`       | 400  | `fuel` query param not in `FUEL_TYPES`         |
| `INVALID_GEO`        | 400  | lat/lng/radius partially supplied              |
| `STATION_NOT_FOUND`  | 404  | `GET /stations/:id` where id is unknown        |

**Do not invent new codes without** (a) adding them here, (b) updating `docs/openapi.yaml`, (c) updating the web client in `packages/web/src/lib/api.ts` if it needs to special-case them.

## Endpoints (snapshot — see openapi.yaml for full schemas)

| Method | Path                          | Summary                                |
|--------|-------------------------------|----------------------------------------|
| GET    | `/`                           | Health check (outside `/api/v1`)       |
| GET    | `/api/v1/stations`            | List stations — filters + pagination   |
| GET    | `/api/v1/stations/:id`        | Single station by id                   |
| GET    | `/api/v1/brands`              | Sorted unique brand list               |
| GET    | `/api/v1/metadata`            | Per-state ingest metadata              |

### `GET /api/v1/stations` query params

- `state` — comma-separated `AustralianState` codes. Defaults to `nsw,qld,tas,act` (states with live adapters).
- `brand` — exact match (case-insensitive) on the normalised brand string.
- `fuel` — `FuelType` literal. Required for `sort=price_*`.
- `q` — free text; matches suburb, postcode prefix, name, address.
- `suburb` — case-insensitive substring on suburb only.
- `postcode` — exact postcode match.
- `lat`, `lng`, `radius` — geo filter. All three must be provided together (km). When lat/lng are set, results are sorted by distance.
- `sort` — `price_asc` | `price_desc`. Requires `fuel`.
- `limit` — default 100, max 500.
- `offset` — 0-based.

Pagination is offset/limit (not cursor). Total count is returned in `meta.total`.

## Changing the contract

1. **Edit the route first**, including param validation.
2. **Update `docs/openapi.yaml`** in the same commit.
3. **Update `packages/web/src/lib/api.ts`** if the signature changes.
4. **Bump nothing** — we're pre-v1 in practice; once launched, additive changes stay on `/api/v1`, breaking changes get `/api/v2`.
5. Add a smoke test for the new behaviour (`docs/claude/testing.md`).

## Limits to keep in mind

- `DEFAULT_LIMIT = 100`, `MAX_LIMIT = 500` (constants in `stations.ts`). Raising them is a KV payload concern, not a client concern.
- Filtering happens **in memory** after a KV read of full-state chunks. A 10k-station state is OK; a 500k-station dataset is not. Reconsider the KV schema before that scale.
- CORS is global via `hono/cors()`. Before public launch, restrict to known origins.

## What we're *not* doing (yet)

- No HATEOAS / hypermedia.
- No cursor pagination.
- No sparse fieldsets.
- No `Authorization` header — everything is public reads.
- No rate limiting at the app layer — we rely on Cloudflare's defaults for now.
