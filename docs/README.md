# ServoMap — docs index

| File                                          | Purpose                                             |
|-----------------------------------------------|-----------------------------------------------------|
| [`../CLAUDE.md`](../CLAUDE.md)                | Project constitution for agents. Start here.        |
| [`../plan.md`](../plan.md)                    | Product narrative, data sources, roadmap, risks.    |
| [`openapi.yaml`](./openapi.yaml)              | **Source of truth** for the REST API contract.      |
| [`claude/architecture.md`](./claude/architecture.md)   | Package boundaries, data flow, KV schema.      |
| [`claude/conventions.md`](./claude/conventions.md)     | Code style, file layout, naming, imports.      |
| [`claude/adapters.md`](./claude/adapters.md)           | Playbook for adding a new state adapter.       |
| [`claude/api.md`](./claude/api.md)                     | REST conventions, error codes, query params.   |
| [`claude/testing.md`](./claude/testing.md)             | Vitest setup, fixture strategy, coverage.      |
| [`claude/deployment.md`](./claude/deployment.md)       | Vercel + Cloudflare deploy flows, env vars.    |
| [`claude/security.md`](./claude/security.md)           | Secret locations, rotation, CORS.              |
| [`claude/workflows.md`](./claude/workflows.md)         | Git branches, commits, PR + CI flow.           |

Per-package agent notes:

- [`../packages/web/CLAUDE.md`](../packages/web/CLAUDE.md)
- [`../packages/worker/CLAUDE.md`](../packages/worker/CLAUDE.md)
