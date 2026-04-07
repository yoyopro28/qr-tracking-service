# Server Database Layer

This directory is reserved for database-facing code that should stay outside UI routes and components.

Current foundation pieces:
- Prisma schema in `prisma/schema.prisma`
- shared Prisma client in `src/lib/prisma.ts`

Future tickets can add repositories, query services, and transaction helpers here.
