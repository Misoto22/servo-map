# @servo-map/worker — Agent notes

> Parent: [`../../CLAUDE.md`](../../CLAUDE.md). Deep dive: [`../../docs/claude/adapters.md`](../../docs/claude/adapters.md).

## What lives here

Cloudflare Worker + Hono. One responsibility:

**Read API** (`/api/v1/*`) — serves station / brand / metadata from KV. The worker never writes KV.

Ingest lives outside the worker: GitHub Actions runs `scripts/fetch-data.ts` every 15 min, which imports this package's `StateAdapter` list and writes to the same KV via the Cloudflare REST API.

## Rules specific to this package

- **Adapters follow the `StateAdapter` contract** in `src/adapters/types.ts`. To add a state, see [`../../docs/claude/adapters.md`](../../docs/claude/adapters.md).
- **KV keys** come from `src/kv/keys.ts`. Never concatenate keys at call sites.
- **Secrets** are declared in `src/env.ts` and set via `wrangler secret put`. The repo `.gitignore` excludes `.dev.vars`.
- **Route handlers are thin** — validate query params, call KV readers, transform, return. Business logic that spans routes belongs under `utils/` or `kv/`.
- **Hono only.** Don't add a second HTTP framework.
- Station id format: `"{state}-{source_id}"`. Deterministic.
- Prices: **cents per litre** (not dollars, not 0.1-cent units). Convert in the adapter.

## Commands

```bash
pnpm --filter @servo-map/worker dev         # wrangler dev :8787 (uses .dev.vars)
pnpm --filter @servo-map/worker build       # wrangler deploy --dry-run
pnpm --filter @servo-map/worker deploy      # wrangler deploy (prod)
pnpm --filter @servo-map/worker typecheck
pnpm --filter @servo-map/worker lint
pnpm --filter @servo-map/worker test        # vitest (node)
```

## Env / secrets

Declared in `src/env.ts`:

- `KV` (binding — production id in `wrangler.toml`)
- `NSW_API_KEY`, `NSW_API_AUTH`, `QLD_API_TOKEN`

See `.dev.vars.example`.

## Caveats

- Worker runtime is V8 isolate. No Node-only APIs (`fs`, `net`, `Buffer` — `Buffer` is partially available but prefer `Uint8Array`).
- `crypto.randomUUID()` is available.
- `console.log` goes to `wrangler tail` / CF dashboard logs.
- If you need a `setInterval`, rethink — cron triggers are the pattern.
