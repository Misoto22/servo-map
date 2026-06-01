# Deployment

> Last reviewed: 2026-04-22

Two services, two providers.

## Web — Vercel

- **Project:** linked via `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` GH secrets.
- **Trigger:** `.github/workflows/deploy-web.yml` on push to `main` that touches `packages/web/**`, `packages/shared/**`, or the workflow file itself. Manual trigger via `workflow_dispatch`.
- **Command:** `npx vercel deploy --prod` with build-time env passed inline.
- **Runtime env used by the web app:**
  - `NEXT_PUBLIC_API_URL` — e.g. `https://api.servo-map.com`
  - `NEXT_PUBLIC_MAPBOX_TOKEN` — public token, scoped to the production domain
- **Fallback:** if `NEXT_PUBLIC_API_URL` is unset, `packages/web/src/lib/api.ts` defaults to `http://localhost:8787`. Never rely on that in production.

### Rollback (web)

- Vercel dashboard → Deployments → **Promote to production** on the last known good deploy.
- Or `npx vercel rollback <deployment-url>` with `VERCEL_TOKEN` exported.

## Worker — Cloudflare

- **Project:** `servo-map-api` (see `packages/worker/wrangler.toml`).
- **Custom domain:** `api.servo-map.com`.
- **KV namespace:** `KV` binding, id `7bb3949a4e20480fbde7fefeadd1fe41` (preview: `2680cad997854e1c81dd38bd6a8cfaaa`).
- **Trigger:** `.github/workflows/deploy-worker.yml` on push to `main` that touches `packages/worker/**`, `packages/shared/**`, or the workflow file itself. Manual via `workflow_dispatch`.
- **Command sequence:**
  1. `pnpm --filter @servo-map/shared build` (shared must build first — worker imports types).
  2. Push each secret via `wrangler secret put` (workflow does this from GH secrets).
  3. `pnpm --filter @servo-map/worker run deploy` (which is `wrangler deploy`).
- **Local dev:** `pnpm dev:worker` reads `.dev.vars`. KV uses the preview namespace.

### Rollback (worker)

- `npx wrangler rollback --config packages/worker/wrangler.toml` → pick a recent version id.
- Or `wrangler deployments list` → `wrangler rollback <deployment-id>`.

## Ingest cron

- **Runner:** GitHub Actions, `.github/workflows/fetch-data.yml`, schedule `*/15 * * * *` (+ `workflow_dispatch`).
- **Command:** `npx tsx scripts/fetch-data.ts`.
- **Why GH Actions, not CF cron:** ingest is off Cloudflare Cron Triggers because NSW rate-limits Cloudflare's shared egress IPs. The worker is read-only and has no scheduled handler. To migrate back to CF cron, add a `scheduled` export that calls the adapter list plus `[triggers].crons` in `wrangler.toml`, and disable the `fetch-data.yml` schedule first.
- **Env consumed by the script:**
  - `NSW_API_KEY`, `NSW_API_AUTH`, `QLD_API_TOKEN` (and whatever new adapters need)
  - `CF_ACCOUNT_ID`, `CF_API_TOKEN`
  - `CF_KV_NAMESPACE_ID` (hardcoded in the workflow today; centralise if it changes)

## Environment variable inventory

| Name                        | Where                         | Purpose                                                   |
|-----------------------------|-------------------------------|-----------------------------------------------------------|
| `NSW_API_KEY`               | Worker secret, GH secret      | NSW FuelCheck API key header                              |
| `NSW_API_AUTH`              | Worker secret, GH secret      | Basic auth header for NSW OAuth token request             |
| `NSW_API_SECRET`            | GH secret (deploy-worker)     | Legacy slot set by deploy workflow — remove if unused     |
| `QLD_API_TOKEN`             | Worker secret, GH secret      | QLD FPPDirect subscriber token                            |
| `NEXT_PUBLIC_API_URL`       | Vercel build env, GH secret   | Base URL for the web app to call the worker               |
| `NEXT_PUBLIC_MAPBOX_TOKEN`  | Vercel build env, GH secret   | Public Mapbox token (scope: production domain)            |
| `VERCEL_TOKEN`              | GH secret                     | Deploy auth                                               |
| `VERCEL_ORG_ID`             | GH secret                     | Project linkage                                           |
| `VERCEL_PROJECT_ID`         | GH secret                     | Project linkage                                           |
| `CLOUDFLARE_API_TOKEN`      | GH secret                     | Wrangler auth + KV REST writes                            |
| `CLOUDFLARE_ACCOUNT_ID`     | GH secret                     | CF account scoping                                        |
| `CF_KV_NAMESPACE_ID`        | Hardcoded in fetch-data.yml   | KV namespace the ingest writes to                         |

> Keep this table aligned with `packages/worker/.dev.vars.example` and `packages/web/.env.example`.

## Known mismatch

`packages/worker/src/env.ts` declares `NSW_API_AUTH` and `NSW_API_KEY`. The deploy-worker workflow also sets `NSW_API_SECRET`, which isn't referenced in `env.ts`. If it's genuinely unused, remove it from the workflow and from GH secrets. If it *is* used by a future adapter, add it to `env.ts`. Flag this during next cleanup pass.

## Domain / DNS

- `servo-map.com` — pending registration.
- `api.servo-map.com` — custom domain on the CF Worker (declared in `wrangler.toml`).
- Update `wrangler.toml` and Vercel domain settings together if the domain changes.

## Post-deploy verification

After a deploy, always hit:

```bash
curl -s https://api.servo-map.com/ | jq
curl -s "https://api.servo-map.com/api/v1/metadata" | jq
curl -s "https://api.servo-map.com/api/v1/stations?state=nsw&limit=1" | jq '.meta'
```

And visit the web app's map for one interaction to confirm Mapbox token is still valid.
