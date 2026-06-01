# Workflows

> Last reviewed: 2026-04-22

## Branching

- Default branch: `main`.
- Always work on a feature branch — **never commit directly to `main`**.
- Naming: `<type>/<slug>` where type is one of `feat` / `fix` / `chore` / `docs` / `refactor` / `test`.
  - Examples: `feat/wa-adapter`, `fix/mapbox-cluster-radius`, `chore/vercel-analytics`.
- Branches are deleted on merge (squash-merge handles this automatically).

## Commit style

- Conventional Commits: `type: subject` (imperative, lowercase, ≤ 72 chars).
- One logical change per commit.
- English only for commit messages.
- Include `Co-Authored-By:` trailer when Claude assisted.

Examples:

```
feat: add WA FuelWatch adapter
fix: preserve metadata for states whose adapter failed
chore: add Vercel Analytics to web app
docs: document station id format
```

## Pre-commit hygiene

Before opening a PR:

```bash
pnpm -r typecheck       # must pass
pnpm -r lint            # must pass
pnpm -r test            # must pass
pnpm --filter @servo-map/web build   # catch Next-only breakage
```

CI runs the same gates; running them locally saves a round trip.

## PR

- Title mirrors the primary commit (`type: subject`).
- Body has two sections:
  - **Summary** — what changed, 1–3 bullets.
  - **Test plan** — checkbox list.
- Link the issue / roadmap item when relevant.
- Small PRs review faster. Split a multi-concern change.

## CI gates (`.github/workflows/ci.yml`)

Runs on every PR and on push to `main`:

1. `Typecheck` — `pnpm -r typecheck` (after `shared` builds).
2. `Lint` — currently `pnpm --filter @servo-map/web lint`; worker lint will join after Phase 2 A.
3. `Build Web` — proves the Next.js build is still green.
4. `Test` — `pnpm -r test` (added in Phase 2 C).

All four must pass before merge.

## Merge

- **Squash merge** only. `gh pr merge <n> --squash --delete-branch`.
- The squash commit subject becomes the `main` history entry — make sure it's clean.
- Do not merge your own PR without a green CI.

## Release

There is no separate release step today — `main` deploys via the `deploy-web.yml` and `deploy-worker.yml` workflows on paths that matter. A commit to `main` touching `packages/web` ships the web; a commit touching `packages/worker` ships the worker. `packages/shared` changes ripple to both.

## The `/ship` skill

The `/ship` skill (Claude) automates: typecheck + lint → commit → branch → push → PR → wait for CI → squash-merge. Use it after finishing a coherent change:

```
/ship
```

It will stop and ask if CI fails twice, or if tests fail beyond two retries.

## Hotfixes

- Same flow — branch, PR, squash-merge. The speed gain from skipping review for "just one line" is not worth bypassing CI.
- For a fix that must go out immediately: open the PR, use `gh pr merge --admin --squash` only if you're the repo owner **and** CI is green.

## Don't

- Force-push `main`.
- Merge a PR with a red CI.
- Commit `.env`, `.dev.vars`, `node_modules`, or `.next/`.
- Rebase `main` onto a feature branch.
- Amend a commit that's already on a pushed PR unless you're comfortable force-pushing **the feature branch** (never `main`).
