# Deploy frontend on Cloudflare Worker

This project now supports deploying the Next.js frontend as a separate Worker while keeping the existing API worker.

## What is already configured

- API worker deploy: `npm run worker:deploy`
- Frontend worker build: `npm run frontend:build`
- Frontend worker deploy: `npm run frontend:deploy`
- Frontend worker local run: `npm run frontend:dev`
- Frontend worker Wrangler config: `wrangler.frontend.toml`

## Recommended setup (separate workers)

Use two workers:

1. `cutlist-pro` for API (`workers/api.ts`)
2. `cutlist-pro-frontend` for Next.js UI (`.open-next/worker.js`)

### 1) Deploy API worker

```bash
npm run worker:deploy
```

### 2) Set frontend API URL

Set this before build/deploy so browser code points to your API worker domain:

```bash
export NEXT_PUBLIC_API_URL="https://<your-api-worker>.<your-subdomain>.workers.dev"
```

### 3) Deploy frontend worker

```bash
npm run frontend:deploy
```

## Same-domain behavior

If `NEXT_PUBLIC_API_URL` is not set in production, the app now defaults to same-origin `/api/*` calls.

That is useful only when your frontend and API are served under the same host (for example with custom routing/proxy in front of workers).

## Notes

- `.open-next/` is build output and is intentionally git-ignored.
- Keep `NEXT_PUBLIC_API_URL=http://127.0.0.1:8787` in local dev if you run `next dev` and `wrangler dev` separately.
