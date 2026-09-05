# QR Tracking Service

A tenant-ready QR campaign application using a React/Vite admin SPA, Supabase
Auth/PostgreSQL/Storage, Cloudflare KV redirects and Workers Analytics Engine.

## Local setup

Prerequisites: Node.js 22+, Docker, Supabase CLI and a Cloudflare account for
remote Analytics Engine testing.

```bash
npm install
cp .env.example .env.local
npm run supabase:start
npm run dev
```

Copy the local API URL and publishable key printed by `supabase start` into
`.env.local`. `supabase start` applies all migrations automatically. Only use
`npm run supabase:reset` when you intentionally want to delete all local data.

Run the redirect Worker separately:

```bash
cd workers/redirect
npx wrangler dev
```

Use `workers/redirect/.dev.vars` for `HMAC_SECRET`. The sync Worker uses
`workers/cache-sync/.dev.vars` for `SUPABASE_SECRET_KEY` and
`SYNC_WEBHOOK_SECRET`; never commit either file.
Copy the adjacent `.dev.vars.example` files as a starting point.
Its base Wrangler config already points at local Supabase; Preview and Production
URLs live only in the named environment blocks.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build:check
npm run worker:check
npm run worker:dry-run
npm run supabase:lint
npx supabase test db
npm run test:e2e
```

The SQL migration creates private Storage buckets, all RLS policies, atomic batch
and activation RPCs, QR route projection, the retryable cache outbox and daily scan
rollups. See [docs/architecture.md](docs/architecture.md) for runtime boundaries,
event fields, consistency semantics and deployment secrets.

The ordered production setup, including every Supabase/Cloudflare/GitHub value,
is in [docs/production-deployment.md](docs/production-deployment.md). Deployment
validation deliberately fails while Worker configs still contain placeholder
resource IDs or URLs.

Pull requests run a fast CI check without deploying. Supabase/Playwright
integration tests and Worker dry-runs are an explicit manual full check.
Releases are started together through the manual `Deploy` workflow. Its
`admin`, `backend` and `all` scopes avoid unrelated redeployments; the rare
`bootstrap` scope additionally refreshes secrets, runtime hooks and the KV cache.

The historical Next.js/Prisma/PostgreSQL/filesystem implementation remains
reproducible from the immutable tag `node-postgres-filesystem-v1`.

After the first Worker deployment, run `npm run cache:reconcile` with
`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CACHE_SYNC_URL` and
`SYNC_WEBHOOK_SECRET` set. This materializes all unsynchronized route projections
in KV and is safe to repeat.

Older design notes are indexed and clearly marked as historical in
[docs/README.md](docs/README.md).
