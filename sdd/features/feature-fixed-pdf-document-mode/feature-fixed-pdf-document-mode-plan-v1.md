# Fixed-PDF document mode — plan v1

## Approach

Build bottom-up: types/data model and storage/hash helpers first (pure,
testable, no UI dependency), then the server routes that depend on them
(source-pdf serving, export bypass, docx/epub guards), then the import UX
that populates the new fields, then the workspace/preview UI that reads
them. Each layer gets unit/route/component tests before moving to the next,
so a regression in one layer is caught before it's built on.

## Steps

1. `src/lib/projects/types.ts`: add `DocumentMode`, extend
   `ProjectDocumentSource` and `ImportedDocumentSeed`, add
   `isFixedPdfProject`/`isEditableProject`.
2. `src/lib/projects/hash.ts` (new): `sha256Buffer`. Unit test.
3. `src/lib/blob/client.ts`: add a private-blob helper for the source PDF,
   alongside (not replacing) `uploadProjectBlob`.
4. `src/lib/projects/factories.ts` (`createProjectRecord`): set
   `document.source.mode`; use a real `blobUrl` on the `source-document`
   asset when the seed provides one. Unit tests for both modes.
5. `src/lib/db/repositories.ts` (`mapRowsToProject`): read the new
   `source_metadata` fields back. Round-trip test incl. a legacy-row case.
6. `src/app/api/projects/[projectId]/source-pdf/route.ts` (new): auth,
   ownership, asset lookup, private-blob streaming, headers. Route tests
   (401/404 variants, success).
7. `src/app/api/projects/export/pdf/route.ts`: early `fixed-pdf` bypass.
   Route test asserting `export-builder` is not called.
8. `src/app/api/projects/export/docx/route.ts` and `.../export/epub/route.ts`:
   early `409` guard for `fixed-pdf`. Route tests.
9. `src/lib/projects/actions.ts` (`createProjectAction`): read
   `documentMode` from the form, hash + upload + thread through to
   `createProjectRecord` for the `fixed-pdf` case; `editable` path
   untouched.
10. `src/lib/i18n/messages.ts`: add the new ES/EN keys (parity test enforces
    sync).
11. `src/components/projects/DocumentImporter.tsx`: mode selector, shown
    only for PDF, submitted as a hidden `documentMode` field. Component
    test.
12. `src/components/projects/FixedPdfPreview.tsx` (new): pdfjs-dist viewer
    against the source-pdf route.
13. `src/components/projects/ProjectWorkspace.tsx`: `fixedPdf` gating for
    steps 2–5 (informational panel), step 6 (`FixedPdfPreview`), step 9
    (export actions), nav bounds. Component tests.
14. `src/components/projects/DocumentDataModal.tsx`,
    `EditorialMapPanel.tsx`, `DocumentStatsCard.tsx`: fixed-pdf adjustments
    described in the spec.
15. Local gates: `npm run lint`, `npx tsc --noEmit`, `npm run test:run`,
    `npm run build`.
16. Targeted E2E spec (env-var-gated, no committed credentials).

## Risk / rollback

See spec's "Rollback considerations". The highest-risk step is 7 (export
bypass) — a mistake there could silently route an `editable` project's
export through the wrong branch. Mitigated by the explicit regression test
in step 7 asserting `export-builder` IS called for `editable` projects, not
just that it's skipped for `fixed-pdf`.
