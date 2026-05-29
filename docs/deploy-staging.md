# Staging deployment (Cloudflare Workers Builds)

Staging is an isolated copy of the two production Workers, deployed by **Cloudflare
Workers Builds** — the same Git integration that deploys prod — with its own D1 +
KV and its own domain. Production (`cutlist-pro` API + `cutlist-pro-frontend` on
`app.panelexcenter.com`) is never touched.

Two Workers come from this one repo, so each Workers Build project must be told
which wrangler config to deploy via its **Deploy command** (a `wrangler deploy`
with no `-c` always picks the root `wrangler.toml`, which is the **API**).

## Resources (already provisioned in the jussmor account)

| Thing            | Value                                                      |
| ---------------- | ---------------------------------------------------------- |
| Staging D1       | `cutlist-db-staging` — `f71c6227-58b4-4d1f-9026-0b285d9ffce5` |
| Staging KV       | `cutlist-pro-staging-kv` — `283537d17acf4b419388a63a9de2acf2` |
| Staging API cfg  | `wrangler.staging.toml` (name `staging-cutlist-pro`)        |
| Staging FE cfg   | `wrangler.frontend.staging.toml` (name `staging-cutlist-pro-frontend`) |

## 1) Fix the EXISTING prod frontend (currently serves the API)

`cutlist-pro-frontend` is deploying the default `wrangler.toml` (the API), so
`app.panelexcenter.com` returns API JSON instead of the app. In Cloudflare →
Workers & Pages → **cutlist-pro-frontend → Settings → Builds**:

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx wrangler deploy -c wrangler.frontend.toml`
- Build variable: `NEXT_PUBLIC_API_URL = https://cutlist-pro.jussmor.workers.dev`

Re-deploy → `app.panelexcenter.com` renders the Next app (incl. `/studio`).
Leave **cutlist-pro** (API) on its default config.

## 2) Create the two staging Workers Build projects

Workers & Pages → **Create** → Workers → connect this repo, branch **`staging`**.
Do it once per worker:

### `staging-cutlist-pro` (API)
- Branch: `staging`
- Build command: *(none)*
- Deploy command:
  `npx wrangler d1 migrations apply cutlist-db-staging --remote -c wrangler.staging.toml && npx wrangler deploy -c wrangler.staging.toml`
- URL: `https://staging-cutlist-pro.jussmor.workers.dev`

### `staging-cutlist-pro-frontend` (frontend)
- Branch: `staging`
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx wrangler deploy -c wrangler.frontend.staging.toml`
- Build variable: `NEXT_PUBLIC_API_URL = https://staging-cutlist-pro.jussmor.workers.dev`
- Custom domain (optional, mirrors prod): add `staging.panelexcenter.com` under
  the worker's **Domains & Routes**.

## 3) Keep prod branch-safe

For the **prod** projects (`cutlist-pro`, `cutlist-pro-frontend`), set the
production branch to `main` and turn off "deploy preview builds for non-production
branches" if you don't want feature branches creating prod preview versions.

## Secrets — Odoo API key

Set per environment (encrypted, not in `[vars]`):

```bash
wrangler secret put ODOO_API_KEY -c wrangler.staging.toml   # staging
```

For local `wrangler dev`, copy `.dev.vars.example` → `.dev.vars`.

### ⚠️ Production remediation (do before the next prod deploy)

`wrangler.toml` still has `ODOO_API_KEY` in plaintext, and it's in git history.
Without breaking prod: (1) **rotate** the key in Odoo, (2) `wrangler secret put
ODOO_API_KEY` against prod, (3) verify `https://cutlist-pro.jussmor.workers.dev/api/sheets`,
(4) remove the plaintext line from `wrangler.toml`. No code change needed —
`workers/odoo.ts` reads `env.ODOO_API_KEY` and secrets inject like vars.

## Verify staging (and that prod is untouched)

```bash
curl https://staging-cutlist-pro.jussmor.workers.dev/api/health    # {ok:true}
curl https://staging-cutlist-pro.jussmor.workers.dev/api/projects  # empty -> separate D1
```

Open the staging frontend (`staging.panelexcenter.com` or the staging frontend's
`*.workers.dev`) at `/studio` and confirm in the network tab it calls the
**staging** API host.

## Manual deploy (optional, local with `wrangler login`)

```bash
npm run worker:deploy:staging
npm run db:migrate:staging
NEXT_PUBLIC_API_URL=https://staging-cutlist-pro.jussmor.workers.dev npm run frontend:deploy:staging
```
