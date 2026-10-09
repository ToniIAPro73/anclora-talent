# Collaboration Workspace v2 — Plan v1

1. Extend `CollaborationView` (owner, outline, suggestion changes/stale/role) with pure,
   unit-tested helpers (`workspace-model.ts`: filters, counts, chapter lookup).
2. New components in `src/components/projects/collaboration-workspace/`:
   `CollaborationWorkspace` (state + actions), `TeamPanel`, `InviteDialog`,
   `ChapterReader`, `ReviewPanel` (comments + suggestions).
3. i18n keys under `collaboration` (ES/EN) and CSS block `.cw-*` in `globals.css`.
4. Mount in `ProjectWorkspace` step 6 without the legacy rail; collaborator route
   `src/app/(app)/projects/[projectId]/collaborate/page.tsx` (server resolves the role
   with `resolveProjectAccess`; non-members get 404); invitation acceptance links there.
5. Remove `CollaborationPanel`; migrate its tests, keep every role-security expectation.
6. Playwright spec with three accounts (author, corrector, maquetador).
7. Gates: unit, e2e, `tsc`, `lint`, `build`, workspace regression subset.
