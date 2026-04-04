# Anclora Press Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Absorb the full editorial experience of `anclora-press` into `anclora-talent` while keeping Talent branding, product contracts, and a server-first architecture on Clerk, Neon, and Vercel Blob.

**Architecture:** `anclora-talent` remains the primary application and system of record. Features from `anclora-press` are ported as capabilities, then re-anchored to Talent domain models, server actions, Neon persistence, Blob asset storage, and contract-tested premium UI. Local-first persistence from Press is explicitly deferred.

**Tech Stack:** Next.js App Router, TypeScript, Clerk, Drizzle + Neon, Vercel Blob, server actions, Vitest, Tailwind, rich text editor ported from Tiptap-based Press components, Talent contract docs in `docs/standards/`.

---

## File Structure

### Existing files that will be extended

- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\db\schema.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\db\repositories.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\types.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\factories.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\actions.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\(app)\dashboard\page.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectCard.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\import.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\CreateProjectForm.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\EditorForm.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\CoverForm.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\i18n\messages.ts`

### New domain/backend files

- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\import-pipeline.ts`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\chapter-utils.ts`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\asset-types.ts`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\delete.ts`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\api\projects\import\route.ts`

### New UI files

- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectDeleteButton.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectWorkspace.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ChapterOrganizer.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\RichTextEditor.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\DocumentImporter.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\PagedPreview.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\BackCoverForm.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\advanced-cover\AdvancedCoverEditor.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\advanced-cover\Canvas.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\advanced-cover\Toolbar.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\advanced-cover\PropertyPanel.tsx`

### New route files

- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\(app)\projects\[projectId]\back-cover\page.tsx`

### Test files

- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\import-pipeline.test.ts`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\delete.test.ts`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectDeleteButton.test.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectWorkspace.test.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\DocumentImporter.test.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\RichTextEditor.test.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\CoverForm.test.tsx`

## Phase Breakdown

### Phase 1: Expand The Editorial Domain

**Outcome:** Talent can persist real editorial structure in Neon and reference heavy assets in Blob.

#### Task 1: Extend project types for multi-chapter editorial data

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\types.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\factories.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\import-pipeline.test.ts`

- [ ] Define target shapes for chapters, blocks, source metadata, cover assets, back cover, and project assets.
- [ ] Keep existing public names where possible to reduce churn in route files.
- [ ] Add backward-compatible defaults so current MVP records still hydrate.
- [ ] Add tests proving legacy records are upgraded in-memory into the expanded shape.
- [ ] Commit: `feat: expand editorial domain types`

#### Task 2: Extend Drizzle schema and repository graph

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\db\schema.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\db\repositories.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\db\repositories.test.ts`

- [ ] Add tables or columns for chapters, assets, and back cover data, reusing the current project/document graph style.
- [ ] Introduce repository load/save support for full chapter lists instead of assuming only the first chapter matters.
- [ ] Add a repository delete pathway that removes project graph rows safely in DB mode and memory mode.
- [ ] Add tests for create, get, save, and delete on the expanded graph.
- [ ] Commit: `feat: extend repository graph for editorial projects`

#### Task 3: Add Blob-oriented asset abstractions

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\asset-types.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\types.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\blob\client.ts`

- [ ] Define asset roles such as `source-document`, `cover-background`, `cover-render`, `back-cover-render`, `preview-derivative`.
- [ ] Standardize the metadata stored in Neon for Blob-backed objects.
- [ ] Ensure the upload client can tag project-scoped assets without UI-specific assumptions.
- [ ] Commit: `feat: add project asset model`

### Phase 2: Migrate Advanced Import

**Outcome:** Imported files create real editorial structures rather than a shallow text dump.

#### Task 4: Build a server-first import pipeline

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\import-pipeline.ts`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\chapter-utils.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\import.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\import-pipeline.test.ts`

- [ ] Port the semantic import ideas from Press, but return Talent-native chapter/block data.
- [ ] Keep support for `txt`, `md`, `pdf`, `doc`, `docx`; treat additional formats as phase-5 candidates.
- [ ] Generate chapter structure, title candidates, import warnings, and source metadata.
- [ ] Preserve current lightweight parser tests and add richer tests for multi-chapter imports.
- [ ] Commit: `feat: add advanced import pipeline`

#### Task 5: Add an import API route for larger workflows

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\api\projects\import\route.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\actions.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\DocumentImporter.test.tsx`

- [ ] Move heavy import processing out of the create-only form path into a reusable route or action boundary.
- [ ] Add file-size validation, extension validation, and friendly error messages aligned with Talent messaging.
- [ ] Store original file metadata and Blob references when the source document should be retained.
- [ ] Commit: `feat: expose project import endpoint`

#### Task 6: Upgrade project creation UX around imports

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\CreateProjectForm.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\DocumentImporter.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\i18n\messages.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\DocumentImporter.test.tsx`

- [ ] Replace the raw file field UX with a dedicated importer component inspired by Press but styled to Talent contracts.
- [ ] Support drag-and-drop, progress/error states, and post-import confirmation.
- [ ] Ensure a project can be created empty or from an import without duplicating flows.
- [ ] Commit: `feat: upgrade project import ux`

### Phase 3: Replace The MVP Editor With A Real Workspace

**Outcome:** Talent gains a real editorial workspace with multi-chapter editing and integrated preview.

#### Task 7: Add project deletion end-to-end

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\delete.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\actions.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\db\repositories.ts`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectDeleteButton.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectCard.tsx`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\delete.test.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectDeleteButton.test.tsx`

- [ ] Implement project deletion in memory mode and DB mode, including related rows and optional Blob cleanup policy.
- [ ] Add a premium-contract-compliant destructive action with confirmation UX.
- [ ] Update dashboard cards to expose delete without degrading current layout.
- [ ] Commit: `feat: add project deletion`

#### Task 8: Introduce a project workspace shell

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectWorkspace.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ChapterOrganizer.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\(app)\projects\[projectId]\editor\page.tsx`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectWorkspace.test.tsx`

- [ ] Replace the current two-column form page with a workspace shell adapted from Press concepts.
- [ ] Add chapter navigation, editor pane, preview pane, and top-level actions.
- [ ] Keep all surfaces, spacing, and accents compliant with Talent branding.
- [ ] Commit: `feat: add editorial workspace shell`

#### Task 9: Port the rich text editor on top of Talent persistence

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\RichTextEditor.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\EditorForm.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\package.json`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\RichTextEditor.test.tsx`

- [ ] Port Tiptap capabilities from Press, but wire save operations to Talent server actions instead of local persistence.
- [ ] Preserve chapter and document title editing in the expanded domain.
- [ ] Introduce debounced save and optimistic feedback without making the browser the source of truth.
- [ ] Commit: `feat: add rich text editor`

#### Task 10: Add paged preview from the canonical project structure

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\PagedPreview.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\(app)\projects\[projectId]\preview\page.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectWorkspace.tsx`

- [ ] Port the preview behavior from Press using the Talent document model.
- [ ] Ensure preview reads canonical saved chapter content.
- [ ] Keep preview usable both as a dedicated route and as an integrated pane in the workspace.
- [ ] Commit: `feat: add paged preview`

### Phase 4: Port Cover And Back-Cover Experience

**Outcome:** Talent gains advanced visual cover tooling with Blob-backed assets and Talent styling.

#### Task 11: Upgrade the simple cover form into a full cover system

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\CoverForm.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\actions.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\CoverForm.test.tsx`

- [ ] Expand cover data to include layout, font choices, overlays, derived render references, and background assets.
- [ ] Preserve current simple flow as a baseline mode.
- [ ] Introduce the advanced editor entry point without breaking existing cover route behavior.
- [ ] Commit: `feat: expand cover data and ui`

#### Task 12: Port the advanced cover editor under Talent branding

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\advanced-cover\AdvancedCoverEditor.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\advanced-cover\Canvas.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\advanced-cover\Toolbar.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\advanced-cover\PropertyPanel.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\CoverForm.tsx`

- [ ] Port the advanced canvas workflow from Press.
- [ ] Replace any Press-specific visual tokens, control styling, and modal behavior with Talent-compliant variants.
- [ ] Save resulting images and heavy assets to Blob, with only references in Neon.
- [ ] Commit: `feat: port advanced cover editor`

#### Task 13: Add back-cover support

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\BackCoverForm.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\(app)\projects\[projectId]\back-cover\page.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\types.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\actions.ts`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\i18n\messages.ts`

- [ ] Port back-cover concepts from Press into Talent.
- [ ] Keep the route and navigation symmetrical with cover editing.
- [ ] Ensure saved back-cover output participates in preview/export later.
- [ ] Commit: `feat: add back cover flow`

### Phase 5: Finish Product Loop, Hardening, And Contracts

**Outcome:** Talent becomes the full editorial product without regressions against contracts.

#### Task 14: Add export integration from the full project model

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\(app)\projects\[projectId]\preview\page.tsx`
- Create or modify export route files as needed under `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\api\`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\ProjectWorkspace.tsx`

- [ ] Port PDF export concepts from Press only after preview is canonical.
- [ ] Build exports from Neon-backed chapters plus current cover assets.
- [ ] Persist export metadata in the project graph where useful.
- [ ] Commit: `feat: add project export flow`

#### Task 15: Add contract-focused visual and behavior checks

**Files:**
- Modify or create test files under `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\app\`
- Modify or create test files under `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\`
- Reference: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\docs\standards\ANCLORA_PREMIUM_APP_CONTRACT.md`
- Reference: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\docs\standards\ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md`
- Reference: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\docs\standards\TALENT_COLOR_PALETTE.md`

- [ ] Add tests that lock in premium surfaces, branded controls, and destructive-action behavior on migrated screens.
- [ ] Add tests or assertions for localization completeness where new strings were introduced.
- [ ] Run lint and test suite and fix regressions before final merge.
- [ ] Commit: `test: add migration contract coverage`

#### Task 16: Remove obsolete MVP assumptions

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\README.md`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\EditorForm.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\lib\projects\import.ts`
- Modify any stale MVP-only routes or copy discovered during implementation

- [ ] Delete or rewrite MVP-only copy that still describes Talent as lacking real import/export.
- [ ] Remove dead form logic that only existed for the single-chapter textarea flow.
- [ ] Update docs so the repo reflects the new product shape accurately.
- [ ] Commit: `chore: remove obsolete mvp assumptions`

## Cross-Cutting Rules

- Keep `Clerk + Neon + Blob` as the production architecture.
- Do not port IndexedDB as the persistence base in this plan.
- Do not copy Press UI classes directly if they conflict with Talent premium contracts.
- Treat Blob cleanup as an explicit policy choice during delete flows.
- Prefer feature flags or incremental route swaps where a migration cannot land atomically.

## Verification Matrix

- `npm run lint`
- `npm run test:run`
- Targeted import tests for `txt`, `md`, `pdf`, `docx`
- Manual validation:
  - create project
  - import document
  - inspect generated chapters
  - edit chapter content
  - save and reload
  - design cover
  - delete project
  - preview and export

## Dependency Order

1. Domain expansion
2. Repository support
3. Asset model
4. Import pipeline
5. Import UX
6. Delete flow
7. Workspace shell
8. Rich editor
9. Preview
10. Cover and back-cover
11. Export
12. Contract hardening and cleanup

## Notes For Execution

- The high-risk integration points are schema/repository expansion, advanced import, and cover asset persistence.
- If implementation pressure is high, split execution into three PRs:
  - PR1: domain + import + delete
  - PR2: workspace + editor + preview
  - PR3: cover/back-cover + export + contract hardening
