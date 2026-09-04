# Cloudflare Edge + Supabase architecture

Supabase PostgreSQL is the only source of truth for users, workspaces, campaigns,
templates, flyer batches, flyers, locations, activations, redirect projections and
long-term daily analytics. The browser uses only a publishable key; PostgreSQL and
Storage RLS enforce workspace membership on every request.

The Vite SPA is deployed with Workers Static Assets. PDF templates and generated
batches live in private Supabase Storage buckets. PDF generation runs in a browser
Web Worker. QR modules are drawn as PDF vectors rather than embedded bitmaps.

The public redirect Worker performs one KV lookup and never contacts Supabase. It
returns 307 for an active route, 410 for a tombstone and 404 for an unknown slug.
Raw scan observations go to the `qr_scans` Analytics Engine dataset. Blob order is:

1. workspace UUID
2. campaign UUID
3. flyer UUID
4. location UUID or an empty string
5. country code
6. HTTP status
7. coarse user-agent category
8. UTC-day HMAC IP fingerprint

`double1` is `1`, and the sampling index is the workspace UUID. Raw IP addresses,
full referrers and query strings are never written.

The protected analytics Edge Function reads yesterday plus the current UTC day
from Analytics Engine and older completed days from `scan_rollups_daily`. A
second, workspace-level daily rollup preserves non-duplicated Unique-IP-day
totals while the dimensional table drives rankings. The cutover is exclusive, so
the two sources are never counted twice. The rollup reader rechecks workspace
membership inside PostgreSQL.

Every route mutation updates `qr_routes.version` and inserts an outbox row in the
same transaction. A webhook wakes the cache-sync Worker, while its minute cron is
the reliable retry path. The Worker always reads the current projection before it
writes KV. Disabled slugs are permanent versioned tombstones. The 03:00 UTC cron
also re-enqueues every projection where `cache_version < version`.

Each invocation claims at most 15 events. Even when every event takes the failure
path, this remains below the Workers Free limit of 50 external subrequests per
invocation; subsequent minute runs drain the remainder.

`SYNCED` means Cloudflare accepted all KV writes for a batch. KV propagation is
eventually consistent, so an older destination may still be visible at another
edge location for roughly a minute or occasionally longer.

## Environments and secrets

Preview and production must use separate Supabase projects, Storage buckets, KV
namespaces and Workers. Replace the all-zero KV namespace IDs in both Worker
configs with the same environment-specific namespace ID before deployment.

Set Worker secrets with `wrangler secret put`:

- redirect: `HMAC_SECRET`
- cache-sync: `SUPABASE_SECRET_KEY`, `SYNC_WEBHOOK_SECRET`

Supabase supplies `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS` and
`SUPABASE_SECRET_KEYS` to deployed Edge Functions automatically. Set only these
application-specific Edge Function secrets:

- `ALLOWED_ORIGINS`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ANALYTICS_READ_TOKEN` (Account Analytics Read only)
- `CLOUDFLARE_ANALYTICS_DATASET` (`qr_scans_preview` or `qr_scans`)
- `ROLLUP_CRON_SECRET`
- `MAINTENANCE_CRON_SECRET`

`npm run deploy:configure-runtime` stores integration values encrypted in
Supabase Vault, installs both daily Cron jobs and activates the database trigger
that POSTs to `/webhook` on each outbox insert. Its payload is intentionally
ignored; the outbox and the Worker's minute Cron remain the reliable event source.
