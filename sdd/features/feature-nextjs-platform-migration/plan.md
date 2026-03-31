# Next.js Platform Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Vite application with a clean-cut Next.js App Router platform using Clerk, Neon, and Blob, and deliver a full authenticated editorial vertical.

**Architecture:** The new app will use Next.js App Router with server-first routing, Clerk for authentication, a lazy-initialized Neon + Drizzle data layer, and client components only where editing interactions require them. Product flow will live under authenticated routes and share one canonical project document model across editor, preview, and cover studio.

**Tech Stack:** Next.js, React, TypeScript, Clerk, Drizzle ORM, Neon serverless, Vercel Blob, Tailwind CSS, Vitest, Testing Library

---

## File Structure

- Create `next.config.ts` for Next.js runtime configuration.
- Create `middleware.ts` for Clerk route protection.
- Create `next-env.d.ts` and refresh `tsconfig.json` for Next.js.
- Create `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
- Create `src/app/sign-in/[[...sign-in]]/page.tsx` and `src/app/sign-up/[[...sign-up]]/page.tsx`.
- Create `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`.
- Create `src/app/(app)/projects/new/page.tsx`.
- Create `src/app/(app)/projects/[projectId]/editor/page.tsx`.
- Create `src/app/(app)/projects/[projectId]/preview/page.tsx`.
- Create `src/app/(app)/projects/[projectId]/cover/page.tsx`.
- Create `src/app/api/blob/upload/route.ts`.
- Create `src/lib/auth/guards.ts`.
- Create `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/db/repositories.ts`.
- Create `src/lib/blob/client.ts`.
- Create `src/lib/projects/types.ts`, `src/lib/projects/mock-data.ts`, `src/lib/projects/actions.ts`.
- Create `src/components/layout/*`, `src/components/projects/*`, `src/components/ui/*`.
- Create `src/test/setup.ts`, `src/lib/projects/actions.test.ts`.
- Modify `package.json`, `package-lock.json`, `.env.example`, `README.md`, `sdd/*.md`.

## Task 1: Replace the platform scaffold

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Modify: `.gitignore`
- Delete: `vite.config.ts`
- Delete: `index.html`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

- [ ] Replace Vite dependencies and scripts with a Next.js App Router baseline.
- [ ] Remove Vite-only files and add the Next.js scaffold.
- [ ] Run `npm install`.
- [ ] Run `npm run lint` and fix base scaffold issues before adding product code.

## Task 2: Add auth shell with Clerk

**Files:**
- Create: `middleware.ts`
- Create: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `src/app/sign-up/[[...sign-up]]/page.tsx`
- Create: `src/lib/auth/guards.ts`
- Modify: `src/app/layout.tsx`
- Modify: `.env.example`

- [ ] Add `ClerkProvider` to the root layout.
- [ ] Protect authenticated routes with Clerk middleware.
- [ ] Add sign-in and sign-up routes.
- [ ] Add auth guard helpers for server components.
- [ ] Document required Clerk environment variables.

## Task 3: Add Neon + Drizzle data layer

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/index.ts`
- Create: `src/lib/db/repositories.ts`
- Create: `src/lib/projects/types.ts`
- Modify: `sdd/data-model.md`
- Modify: `sdd/architecture.md`

- [ ] Define the initial schema for users, projects, documents, blocks, assets, cover designs, layers, templates, and export jobs.
- [ ] Implement lazy `getDb()` access for Neon.
- [ ] Add a repository layer with a mock fallback for local development when env is missing.
- [ ] Align SDD docs with the new backend-first architecture.

## Task 4: Deliver the authenticated product vertical

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/projects/new/page.tsx`
- Create: `src/app/(app)/projects/[projectId]/editor/page.tsx`
- Create: `src/app/(app)/projects/[projectId]/preview/page.tsx`
- Create: `src/app/(app)/projects/[projectId]/cover/page.tsx`
- Create: `src/lib/projects/mock-data.ts`
- Create: `src/lib/projects/actions.ts`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/projects/ProjectSidebar.tsx`
- Create: `src/components/projects/EditorCanvas.tsx`
- Create: `src/components/projects/PreviewCanvas.tsx`
- Create: `src/components/projects/CoverStudio.tsx`

- [ ] Implement the authenticated app shell.
- [ ] Add project creation flow.
- [ ] Add canonical project/document state and actions.
- [ ] Implement editor, preview, and cover pages over the same project model.
- [ ] Keep server/client boundaries explicit.

## Task 5: Add Blob integration and test coverage

**Files:**
- Create: `src/app/api/blob/upload/route.ts`
- Create: `src/lib/blob/client.ts`
- Create: `src/lib/projects/actions.test.ts`
- Modify: `vitest.config.ts`
- Modify: `src/test/setup.ts`
- Modify: `README.md`

- [ ] Add Blob upload token route and storage utility.
- [ ] Add tests for project creation/update actions.
- [ ] Update README with the new platform setup and env requirements.
- [ ] Run `npm run lint`, `npm run test`, and `npm run build`.
