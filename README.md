# QR Tracking Service

Foundation setup for the QR tracking and PDF print service described in the repository Markdown specs. This stage provides the application scaffold, Prisma schema, PostgreSQL wiring, modular source layout, and local setup documentation. It does not yet implement business features such as authentication flows, campaign CRUD, template upload, flyer generation, activation, redirect tracking, or analytics.

## Stack

- Next.js with App Router
- TypeScript in strict mode
- Prisma ORM
- PostgreSQL

## Project Structure

```text
.
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── app/
│   ├── components/
│   ├── domains/
│   ├── lib/
│   └── server/
├── docker-compose.yml
└── README.md
```

### Structure Notes

- `src/app`: Next.js routes, layouts, and page entrypoints
- `src/components`: shared UI and layout building blocks
- `src/domains`: reserved boundaries for domain-specific logic
- `src/lib`: shared utilities such as env parsing and the Prisma client
- `src/server`: backend-oriented code that should stay out of UI components
- `prisma`: schema and migrations

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

Copy the example file and adjust values if needed:

```bash
cp .env.example .env
```

Default values expect a local PostgreSQL database at `localhost:5432`.

### 4. Start PostgreSQL

If you are using Docker:

```bash
docker compose up -d
```

### 5. Apply the initial database migration

```bash
npx prisma migrate dev
```

### 6. Start the app

```bash
npm run dev
```

The app should then be available at `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:studio
```

## Current Status

Implemented in this foundation step:
- runnable Next.js project scaffold
- minimal base layout and home page
- Prisma schema for the documented MVP core entities
- initial migration checked into the repository
- environment and local database setup
- modular source boundaries for future tickets

Deliberately not implemented yet:
- auth provider integration
- workspace context enforcement
- campaign CRUD
- file storage
- PDF processing
- QR generation
- flyer activation
- redirect tracking
- analytics queries and dashboard features
