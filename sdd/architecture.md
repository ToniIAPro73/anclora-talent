# Architecture

## Platform

The application now targets a server-first platform:

- `Next.js App Router`
- `Clerk` for authentication
- `Neon Postgres` for relational persistence
- `Vercel Blob` for binary assets
- `Drizzle ORM` for schema and queries

## Route structure

- `src/app/page.tsx`: public landing
- `src/app/sign-in/**`: authentication entry
- `src/app/sign-up/**`: registration entry
- `src/app/(app)/**`: authenticated application area
- `src/app/api/**`: route handlers

## Domain structure

- `src/lib/projects`: canonical project/document model and server actions
- `src/lib/db`: schema, lazy Neon client, repository layer
- `src/lib/blob`: asset upload utilities
- `src/components/projects`: product UI for dashboard, editor, preview and cover

## Core architectural rule

There must be one canonical project model shared by:

- project creation
- document editing
- preview rendering
- cover persistence
- future import/export services

No route or feature may define a parallel representation without an explicit mapping layer.

## Security rules

- Middleware protects access, but authorization must also be validated in server actions and server components.
- Neon clients must be initialized lazily, never at module scope.
- Blob uploads must be mediated by authenticated server logic.

## Integration order

1. Authenticated Next.js shell
2. Canonical project and document model
3. Neon-backed repository layer with local fallback
4. Blob-backed asset flows
5. Real import/export adapters
6. AI enhancement layer
