# Staging deployment

An **isolated** staging stack that never touches production. Production stays on
`cutlist-pro` / `cutlist-pro-frontend`; staging runs on separate workers with
their own D1 database and KV namespace.

| Resource        | Production                         | Staging                                     |
| --------------- | ---------------------------------- | ------------------------------------------- |
| API worker      | `cutlist-pro`                      | `staging-cutlist-pro`                       |
| Frontend worker | `cutlist-pro-frontend`             | `staging-cutlist-pro-frontend`              |
| D1 database     | `cutlist-db`                       | `cutlist-db-staging` (separate data)        |
| KV namespace    | (prod id)                          | `cutlist-pro-staging-kv` (separate)         |
| Config files    | `wrangler*.toml`                   | `wrangler.staging.toml`, `wrangler.frontend.staging.toml` |

## Automatic deploy (GitHub Actions)

`.github/workflows/deploy-staging.yml` deploys the whole staging stack on every
push to the **`staging`** branch (or via "Run workflow").

One-time setup — add these GitHub repo secrets (Settings → Secrets → Actions):

- `CLOUDFLARE_API_TOKEN` — token with Workers Scripts + D1 + KV edit rights.
- `CLOUDFLARE_ACCOUNT_ID` — optional; only needed if the token sees >1 account.

Then:

```bash
git push origin <your-branch>:staging
```

The workflow: typecheck + lint → deploy API → apply D1 migrations → build the
frontend with `NEXT_PUBLIC_API_URL=https://staging-cutlist-pro.jussmor.workers.dev`
inlined → deploy the frontend.

## Manual deploy (local, requires `wrangler login`)

```bash
npm run worker:deploy:staging
npm run db:migrate:staging
NEXT_PUBLIC_API_URL=https://staging-cutlist-pro.jussmor.workers.dev npm run frontend:deploy:staging
```

## Secrets — Odoo API key

The Odoo key must be an encrypted Worker secret, not a `[vars]` entry. Staging:

```bash
wrangler secret put ODOO_API_KEY -c wrangler.staging.toml
```

For local `wrangler dev`, copy `.dev.vars.example` → `.dev.vars` and fill it in.

### ⚠️ Production remediation (do before the next prod deploy)

`wrangler.toml` still contains `ODOO_API_KEY` in plaintext and that value is in
git history. To remediate **without breaking production**:

1. **Rotate** the key in Odoo (the old one is compromised).
2. Set the new value as a prod secret: `wrangler secret put ODOO_API_KEY`.
3. Verify prod still works: `curl https://cutlist-pro.jussmor.workers.dev/api/sheets`.
4. Remove the `ODOO_API_KEY = "..."` line from `wrangler.toml` and commit.

No code change is needed — `workers/odoo.ts` reads `env.ODOO_API_KEY`, and
secrets are injected into `env` exactly like vars.

## Verify staging is live (and prod is untouched)

```bash
curl https://staging-cutlist-pro.jussmor.workers.dev/api/health      # {ok:true}
curl https://staging-cutlist-pro.jussmor.workers.dev/api/projects    # empty -> separate DB
```

Open `https://staging-cutlist-pro-frontend.jussmor.workers.dev/studio` and
confirm in the network tab that API calls hit the **staging** API host.
