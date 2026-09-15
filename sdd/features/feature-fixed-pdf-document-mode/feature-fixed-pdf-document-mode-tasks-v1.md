# Fixed-PDF document mode — tasks v1

- [x] T1: Add `DocumentMode` type, extend `ProjectDocumentSource` and
  `ImportedDocumentSeed`, add `isFixedPdfProject`/`isEditableProject` in
  `src/lib/projects/types.ts`. Also added `SourceDocumentAccessLevel`
  (T3 deviation) here rather than in `blob/client.ts`, so the type stays
  importable from client components without pulling in `server-only`.
- [x] T2: Add `sha256Buffer` in `src/lib/projects/hash.ts` with a
  known-vector unit test.
- [x] T3: Add a private-blob upload helper for the source PDF in
  `src/lib/blob/client.ts`, leaving `uploadProjectBlob` and every existing
  caller untouched. **Deviation, discovered via a real upload attempt, not
  assumed:** this project's actual Blob store rejects `access: 'private'`
  ("Cannot use private access on a public store"). `uploadPrivateProjectDocument`
  now tries private first and falls back to public on that specific
  failure, persisting which one actually happened as
  `document.source.sourceAccessLevel` so reads never have to re-probe.
  `fetchPrivateProjectDocument` takes that access level explicitly.
- [x] T4: `createProjectRecord` sets `document.source.mode` and uses a real
  `blobUrl` for the `source-document` asset when provided; unit tests for
  both `fixed-pdf` (real blobUrl, mode/sha256/sizeBytes/sourceAccessLevel
  set) and `editable` (unchanged null-blobUrl regression).
- [x] T5: `mapRowsToProject` reads the new `source_metadata` fields
  (mode/sha256/sizeBytes/sourceAssetId/sourceAccessLevel); repository
  round-trip test (`fixed-pdf` create->persist->read) plus a hand-crafted
  legacy row (`mode` absent) loading as `editable`.
- [x] T6: New `GET /api/projects/source-pdf?projectId=` route (query-param
  shape, matching the sibling `export/*` routes' convention exactly rather
  than a `[projectId]` dynamic segment — smaller diff, same auth/ownership
  pattern): auth via `requireUserId`, ownership via `getProjectById`, 404
  variants (no project, no source asset, editable project), private/public
  blob streaming via `fetchPrivateProjectDocument`, `nosniff` header,
  inline/attachment disposition via `?download=1`. Route tests for every
  branch, plus real end-to-end confirmation via Playwright (byte-identical
  response).
- [x] T7: `export/pdf` route: early `fixed-pdf` bypass returning original
  bytes; route test asserting `export-builder`'s `buildProjectPdfWithConfig`
  is NOT called for `fixed-pdf` and IS called for `editable` (regression).
  Confirmed byte-identical via a real Playwright run, not just the mocked
  route test.
- [x] T8: `export/docx` and `export/epub` routes: early `409` guard for
  `fixed-pdf`; route tests for both, `editable` regression-checked.
- [x] T9: `createProjectAction` reads `documentMode`, hashes + uploads via
  T3's helper (wrapped in try/catch — a storage failure of any kind falls
  back to `editable` rather than crashing project creation), threads
  `mode`/`sourceBlobUrl`/`sourceSha256`/`sourceSizeBytes`/`sourceAccessLevel`
  into the seed for `fixed-pdf`; `editable`/DOCX/DOC/TXT/MD path is
  byte-for-byte unchanged (regression-checked).
- [x] T10: Add ES/EN i18n keys for the mode selector, fixed-pdf badges,
  preview labels, and disabled-export tooltips; parity test passes
  unmodified (enforces both locales).
- [x] T11: `DocumentImporter`: PDF-only mode selector (fixed-pdf
  recommended/default), hidden `documentMode` field; component tests for
  PDF (selector shown) and DOCX (selector absent); confirmed live via
  Playwright.
- [x] T12: New `FixedPdfPreview` component: pdfjs-dist canvas viewer against
  the source-pdf route, page nav, loading/error states, responsive,
  theme-safe. **Deviation, caught by a real `next build`:** the worker
  asset collided with this repo's existing `serverExternalPackages`
  entry for `pdfjs-dist` (added for the unrelated server-side `pdf-parse`
  path) — Turbopack silently dropped the worker chunk from the client
  bundle. Fixed by serving it as a static file (`postinstall` copies it to
  `public/pdf.worker.min.mjs`) instead of a bundler-resolved `new URL(...)`
  reference. Confirmed rendering real pages via a live Playwright run
  against `next dev`.
- [x] T13: `ProjectWorkspace`: `fixedPdf` gating — steps 2-5 show an
  "Incluido en el PDF original" panel instead of the real editor (kept all
  9 step ids stable rather than filtering the array, to avoid touching the
  persisted 1-9 `workflowStep` clamp or the `switch(activeStep)` case
  labels — a smaller, lower-risk change than the originally planned
  "skip" navigation), step 6 renders `FixedPdfPreview`, step 9 disables
  DOCX/EPUB and replaces the client-side `PdfExportButton` (discovered:
  it rasterizes `composeProjectPreview` output in the browser — would have
  produced a garbage PDF for a fixed-pdf project) with a link straight to
  the now-bypassing `export/pdf` route. Component tests for `fixed-pdf` (no
  forced CoverStudio/BackCoverStudio) and `editable` (regression); full
  flow re-confirmed live via Playwright.
- [x] T14: `DocumentDataModal` hides/labels composition controls as not
  applicable for `fixed-pdf` (both pre-create and project modes);
  `DocumentStatsCard` replaces the misleading chapter/word/reading-time
  breakdown with a single real page-count stat for `fixed-pdf`.
  `EditorialMapPanel` is not currently rendered anywhere in the app
  (confirmed by a repo-wide search) — nothing to gate.
- [x] T15: Local gates green: `npm run lint` (0 errors, 4 pre-existing
  warnings, none in touched files), `npx tsc --noEmit` (73 pre-existing
  errors both before and after this feature — diffed line-by-line against
  `development` to confirm zero net-new errors), `npm run test:run` (1224
  tests, 193 files, all green), `npm run build` (compiles cleanly; the one
  remaining Turbopack warning is pre-existing and unrelated, traced to
  `export-surface-image.ts`/`@sparticuz/chromium`, not touched here).
- [x] T16: Targeted Playwright spec
  (`e2e/fixed-pdf-document-mode.spec.ts`): a synthetic-fixture describe
  block (always runs, no real file needed — generates a 2-page PDF with
  `pdf-lib` at test time) covering the mode selector, workspace gating,
  `FixedPdfPreview`, and byte-identical export/download, run for real
  against `next dev` (not just written) — both tests pass; plus an
  editable-mode regression test (also run for real, passes). A second,
  env-var-gated describe block (`E2E_PROD_EMAIL`, `E2E_PROD_PASSWORD`,
  `E2E_FIXED_PDF_PATH`) exists for the real mission fixture / production
  walkthrough — correctly skipped (NOT_RUN) since those vars aren't set in
  this session, never a fabricated PASS.
