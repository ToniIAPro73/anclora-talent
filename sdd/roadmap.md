# Roadmap

## Phase 0

Goal: establish the clean-cut platform migration.

- replace Vite with Next.js App Router
- integrate Clerk shell and route protection
- define Neon schema and lazy repository access
- define Blob asset boundary

## Phase 1

Goal: deliver the first authenticated editorial loop.

- login and registration
- dashboard and project creation
- canonical project/document model
- editor, preview and cover routes

## Phase 2

Goal: connect useful inputs and outputs.

- import `txt`
- import `docx`
- upload real cover assets to Blob
- export PDF

## Phase 3

Goal: extend product depth.

- template library
- image placement tools
- EPUB export
- AI editorial assistance
- collaborative workspaces

## Delivery principles

- Each sprint must close a vertical slice.
- Auth, project ownership and persistence must be valid on the server, not only in UI.
- Build, lint and tests must remain passing continuously.
