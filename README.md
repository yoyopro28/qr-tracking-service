# QR Tracking Service

Solo-ready QR tracking and PDF print service built with Next.js, TypeScript,
Prisma, PostgreSQL, and local/persistent filesystem storage.

The current app supports the MVP workflow:

- create and manage campaigns
- upload PDF templates and define QR placement
- generate print-ready flyer PDFs with per-flyer QR codes
- activate flyers for locations
- track public QR redirects through `/r/[shortcode]`
- view basic scan analytics

Admin-facing routes are protected with HTTP Basic Auth. Public QR redirects stay
open so printed flyer links can be scanned without a login.

## Stack

- Next.js App Router
- TypeScript in strict mode
- Prisma ORM
- PostgreSQL
- Filesystem storage for uploaded templates and generated flyer PDFs

## Local Development

### 1. Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker with Compose support, or an existing PostgreSQL 16 instance

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

For local development, the defaults expect PostgreSQL at `localhost:5432` and
store files under `./uploads`.

Required variables:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qr_tracking_service?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-me-before-production"
UPLOADS_DIR="./uploads"
```

`NEXT_PUBLIC_APP_URL` is embedded into flyer tracking URLs when flyers are
generated. If this value changes, generate new flyers before printing real QR
codes.

### 4. Start PostgreSQL

```bash
docker compose up -d
```

### 5. Apply migrations

```bash
npm run db:migrate
```

### 6. Start the app

```bash
npm run dev
```

Open `http://localhost:3000` and sign in with the Basic Auth credentials from
`.env`.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:studio
```

Use `npm run db:deploy` for production-style migration deploys. Use
`npm run db:migrate` only in local development.

## Railway Deployment

Recommended first production setup for solo use:

1. Push the repository to GitHub.
2. Create a Railway project from the GitHub repository.
3. Add a PostgreSQL service in the same Railway project.
4. Add a persistent volume to the Next.js app service.
5. Set the volume mount path to `/data/uploads`.
6. Set app service environment variables:

```bash
DATABASE_URL=<reference the Railway Postgres DATABASE_URL>
NEXT_PUBLIC_APP_URL=https://your-domain.example
ADMIN_USERNAME=<your-admin-user>
ADMIN_PASSWORD=<strong-password>
UPLOADS_DIR=/data/uploads
```

7. Set the Railway pre-deploy command:

```bash
npx prisma migrate deploy
```

8. Deploy the app service.
9. Add your custom domain in Railway and point DNS at Railway as instructed by
   the Railway dashboard.
10. Generate and print real flyers only after the final domain is configured.

The app builds as a Next.js standalone server. `npm run build` runs `next build`
and copies `public` plus `.next/static` into `.next/standalone`; `npm run start`
runs `.next/standalone/server.js`.

## Route Protection

Protected by Basic Auth:

- `/`
- `/campaigns`
- `/admin`
- `/analytics`
- `/api/qr`
- `/api/templates`
- `/api/flyers`

Public:

- `/r/[shortcode]`
- `/_next/*`
- static assets

This is intentionally a lightweight solo-user guard, not a full multi-user auth
system. Do not run production without setting a strong `ADMIN_PASSWORD`.

## Storage

Uploaded templates and generated flyer PDFs are stored below `UPLOADS_DIR`.

- Local default: `./uploads`
- Railway volume recommendation: `/data/uploads`

Database records store relative storage keys such as
`templates/<campaign-id>/<file>.pdf` and
`generated-flyers/<campaign-id>/<file>.pdf`. Older local keys beginning with
`uploads/...` are still resolved for compatibility.

Back up both:

- the PostgreSQL database
- the persistent upload volume

Losing either one can break campaign history or generated PDF downloads.

## Production Smoke Test

After deploying:

1. Open the app domain and confirm Basic Auth is required.
2. Create one campaign.
3. Upload one PDF template and save QR placement.
4. Generate one flyer.
5. Open the generated flyer PDF.
6. Open `/r/<shortcode>` without Basic Auth and confirm it redirects.
7. Reopen analytics and confirm the scan was recorded.
8. Redeploy once and confirm database records and PDFs still exist.
