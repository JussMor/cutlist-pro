---
name: cloudflare-worker-api
description: "Work with the Cloudflare Worker API backend in cutlist-pro. Use when: adding new API routes, modifying D1 database queries, working with KV cache (Odoo sheets, project workspaces), updating Odoo JSON-RPC integration, managing wrangler bindings/secrets, or deploying the worker."
---

# Cloudflare Worker API Skill

## When to Use

- Adding or modifying API routes
- Writing D1 (SQLite) queries for projects or assemblies
- Working with KV cache for Odoo data or project workspaces
- Updating the Odoo JSON-RPC integration (stock sheets, uid cache)
- Managing `wrangler.toml` bindings or secrets
- Deploying the worker (`wrangler deploy`)

## Key Files

- [`workers/api.ts`](../../../workers/api.ts) — Main router (manual `path + method` dispatch)
- [`workers/projects-repo.ts`](../../../workers/projects-repo.ts) — D1 + KV for projects
- [`workers/assemblies-repo.ts`](../../../workers/assemblies-repo.ts) — D1 for assemblies
- [`workers/odoo.ts`](../../../workers/odoo.ts) — Odoo JSON-RPC + KV cache
- [`workers/env.ts`](../../../workers/env.ts) — `Env` interface (D1, KV, ODOO\_\* bindings)
- [`workers/http.ts`](../../../workers/http.ts) — Response helpers (`json()`, `cors()`, etc.)
- [`lib/domain/types.ts`](../../../lib/domain/types.ts) — Shared request/response types
- [`lib/api/client.ts`](../../../lib/api/client.ts) — Frontend API client (typed fetch wrappers)
- [`wrangler.toml`](../../../wrangler.toml) — Worker config, D1/KV bindings
- [`migrations/`](../../../migrations/) — D1 SQL migration files

## Bindings Reference

| Binding            | Type            | Purpose                                                   |
| ------------------ | --------------- | --------------------------------------------------------- |
| `env.DB`           | D1Database      | Projects + assemblies metadata                            |
| `env.KV`           | KVNamespace     | Odoo uid cache, sheets cache, project workspaces          |
| `env.ODOO_URL`     | string          | Odoo base URL                                             |
| `env.ODOO_DB`      | string          | Odoo database name                                        |
| `env.ODOO_USER`    | string          | Odoo login                                                |
| `env.ODOO_API_KEY` | string (secret) | Odoo API key — set via `wrangler secret put ODOO_API_KEY` |

## Adding a New Route

1. Add the handler in `workers/api.ts` in the `switch`/`if` dispatch block
2. If it touches data, add a function in the appropriate repo file (`projects-repo.ts`, `assemblies-repo.ts`) or a new `*-repo.ts`
3. Add the typed client method in `lib/api/client.ts`
4. If a new D1 table is needed, create a migration in `migrations/` with the next sequence number

## D1 Conventions

- Project metadata lives in D1; large workspace JSON lives in KV (key: `project:<id>:workspace`)
- Always use parameterized statements: `db.prepare('SELECT * FROM projects WHERE id = ?').bind(id)`
- Return camelCase in API responses (transform from snake_case DB columns in the repo layer)

## KV Cache Patterns

```typescript
// Odoo uid — 23h TTL
await env.KV.put("odoo:uid", String(uid), { expirationTtl: 82800 });

// Sheets — short TTL (refresh often)
await env.KV.put("odoo:sheets", JSON.stringify(sheets), {
  expirationTtl: 3600,
});

// Project workspace — no expiry (user-managed)
await env.KV.put(`project:${id}:workspace`, JSON.stringify(workspace));
```

## Deployment

```bash
# Deploy worker
npx wrangler deploy

# Run locally (worker + Next.js in parallel)
npm run dev

# Apply D1 migrations
npx wrangler d1 migrations apply cutlist-pro-db

# Set secrets
npx wrangler secret put ODOO_API_KEY
```

## CORS

`workers/http.ts` includes CORS helpers. All routes should use the provided `json()` helper which sets appropriate headers. The worker is accessed by the Next.js frontend during SSR and client-side.
