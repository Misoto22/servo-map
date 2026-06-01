# @servo-map/web — Agent notes

> Parent: [`../../CLAUDE.md`](../../CLAUDE.md). Full conventions: [`../../docs/claude/conventions.md`](../../docs/claude/conventions.md).

## What lives here

Next.js 15 App Router frontend. Map, SEO station/suburb pages, `@vercel/analytics`.

## Rules specific to this package

- **Server components by default.** Add `"use client"` only for Mapbox, hooks, browser APIs.
- **All HTTP goes through `src/lib/api.ts`.** Do not `fetch()` directly from components.
- **Types come from `@servo-map/shared`** — do not redeclare `Station`, `FuelType`, etc.
- **Mapbox must be client-only.** Use `next/dynamic` with `ssr: false` if you need to ensure it never renders server-side.
- Path alias: `@/*` → `./src/*`. Use it; avoid `../../../`.
- Do not introduce a state library (Redux, Zustand) without discussion — current scale is solvable with React state + hooks.

## Commands

```bash
pnpm --filter @servo-map/web dev        # next dev :3000
pnpm --filter @servo-map/web build
pnpm --filter @servo-map/web typecheck
pnpm --filter @servo-map/web lint
pnpm --filter @servo-map/web test       # vitest (jsdom)
```

## Env

- `NEXT_PUBLIC_API_URL` (required for prod; falls back to `http://localhost:8787` in dev)
- `NEXT_PUBLIC_MAPBOX_TOKEN` (required — map won't render without it)

See `.env.example`.

## Caveats

- React 19 + Next 15. Pin upgrades behind a manual check; codemods are available but do not run them automatically.
- Tailwind 4 uses the new `@tailwindcss/postcss` flow (no `tailwind.config.ts`). Respect it.
