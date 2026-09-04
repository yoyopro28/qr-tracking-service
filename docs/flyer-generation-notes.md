# Flyer Generation Notes

> Historical note for the former Next.js/Prisma MVP. Do not use this as an
> operational guide for the current Cloudflare/Supabase application.

## Current MVP assumptions

- Flyer generation currently creates database records only.
- No QR image generation, PDF embedding, or print-ready output is produced in this step.
- `trackingUrl` is still stored because it is required by the current schema.
- Tracking URLs are derived from `NEXT_PUBLIC_APP_URL` plus `/r/{shortcode}` at generation time.
- Shortcodes are generated randomly and retried on unique-collision errors.

## What this step implements

- choose a campaign template
- enter a flyer quantity
- create that many `Flyer` records in PostgreSQL
- assign each flyer:
  - a unique shortcode
  - a derived tracking URL
  - `GENERATED` status
  - `generatedAt`
- list generated flyers on the campaign detail page

## Deliberate limits

- no QR code asset generation yet
- no PDF export yet
- no activation flow yet
- no redirect endpoint yet
- no bulk download yet

## Why this is still useful

This keeps the MVP moving without overcommitting to print infrastructure yet. It proves:

- template-to-flyer relationships
- shortcode uniqueness
- persisted flyer identity
- the campaign-level batch creation workflow
