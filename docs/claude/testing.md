# Testing

> Last reviewed: 2026-04-22

## Framework

**Vitest** everywhere. One config, uniform runner.

- `packages/worker` — node pool, adapters + KV readers/writers.
- `packages/web` — jsdom pool, component + hook tests (add as needed).
- `packages/shared` — no tests (pure types + const arrays).

CI runs `pnpm -r test` as a sibling of `typecheck`, `lint`, and `build-web`.

## Layout

```
packages/worker/
  src/
    adapters/
      __tests__/
        nsw.test.ts
        qld.test.ts
      __fixtures__/
        nsw-prices.json      ← recorded upstream response
        qld-sites.json
        qld-prices.json
    kv/
      __tests__/
        roundtrip.test.ts
  vitest.config.ts
```

Tests sit next to the code they cover (`__tests__/` dir). Fixtures are static JSON captured from the real API (with secrets scrubbed) and committed to the repo.

## What must have tests

- **Every adapter** — one fixture-driven test proving:
  - Station count matches fixture
  - `id` follows `"{state}-<source_id>"`
  - Stations without lat/lng are dropped
  - Prices are in cents/L
  - `fuel` values are valid `FuelType`s
- **KV read/write** — one round-trip proving `writeStations` → `readStationsByState` survives JSON serialisation and preserves order.
- **`writeMetadata` merge semantics** — a failed state keeps its prior `last_updated`.
- **Station filtering logic** (`routes/stations.ts`) — brand filter, fuel filter, geo radius, pagination. These can run against a mocked KV that returns a fixed `Station[]`.

## What does **not** need tests

- React components (for now). Add tests when a component has non-trivial logic beyond rendering props.
- Config files, type re-exports, simple pass-throughs.
- Third-party libraries.

## Mocking

- **KV:** use a hand-rolled `MemoryKV` implementing the subset of `KVNamespace` we actually call (`get`, `put`, optionally `list`). Keep it in `packages/worker/src/kv/__mocks__/memory-kv.ts`.
- **`fetch` in adapter tests:** stub via `vi.stubGlobal("fetch", vi.fn())`. Each test returns a fixture and asserts the adapter called the right URL with the right headers.
- Do **not** hit real upstream APIs in tests.

## Running

```bash
pnpm --filter @servo-map/worker test
pnpm --filter @servo-map/worker test -- --watch
pnpm -r test                  # everything, CI-style
pnpm -r test -- --coverage    # with coverage
```

## Coverage

- Target ≥ 80% line coverage on adapters, KV, and route filtering logic.
- Not enforced in CI as a hard gate yet — we publish the number and improve it before launch.

## Adding a fixture

1. Capture the real response with a secret-bearing `curl`.
2. Scrub every token, transaction id, email, and identifier that maps back to your account.
3. Trim to ~10 stations (keeping at least one with missing coords, one with multiple fuels).
4. Commit under `__fixtures__/` with a dated filename.
