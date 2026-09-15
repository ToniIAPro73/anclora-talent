# Fixed-PDF document mode — spec v1

## Problem

Anclora Talent treats every imported PDF as raw manuscript material: text is
extracted, heuristics rebuild chapters/blocks, and `compose()` re-typesets
everything into Talent's own cover, table of contents and pagination. That is
correct when the user wants an editable project, but wrong when the PDF is
already a finished, laid-out ebook (regression case:
`El_Plan_de_Escape_EBOOK.pdf` — designed cover, typeset interior, images,
existing TOC, back cover). For that case the user does not want Talent to
redesign anything; they want the exact same file preserved, while still
benefiting from metadata/structure extraction for search, navigation and
future AI features.

Today there is no way to express "keep this PDF as-is." Every PDF import
goes through the same editable pipeline, and the original uploaded bytes are
never even persisted (`ProjectAsset.usage: 'source-document'` is created with
`blobUrl: null` and nothing ever fills it in).

## Scope

- A new `DocumentMode` (`'editable' | 'fixed-pdf'`) on `ProjectDocument.source`.
- Persisting the original PDF's bytes (private Vercel Blob) when the user
  chooses `fixed-pdf`, and an authenticated route to serve them back.
- An import-time mode selector, shown only for PDF uploads.
- Workspace/preview/export behavior for `fixed-pdf` projects: no forced
  cover/back-cover/chapter editing, a viewer backed by the original file,
  and PDF export that returns the original bytes unmodified.
- Backward compatibility for every existing project (`mode` undefined ⇒
  `'editable'`).

## Non-goals

- Redesigning the editable pipeline itself (unchanged, see "Compatibility").
- Any "convert fixed-pdf back to editable" feature beyond a documented
  extension point (mission explicitly allows deferring this if it isn't a
  small, safe addition).
- OCR/scanned-PDF recovery — untouched, orthogonal to this feature.
- AI-assisted layout analysis — sidecar metadata extraction reuses the
  existing deterministic pipeline; no new AI usage is introduced.

## Invariants

1. **The uploaded PDF's bytes are the canonical visual source** for a
   `fixed-pdf` project. No parser, compositor, or export path may alter,
   re-render, or re-flow them.
2. **The semantic/metadata pipeline is a sidecar.** It may read the document
   for title/subtitle/author/outline extraction, but its output never
   governs rendering, cover, back cover, TOC or pagination for `fixed-pdf`.
3. **`mode` undefined behaves as `'editable'`** everywhere — no migration,
   no breakage of existing projects.
4. **`uploaded bytes === exported bytes`**, verified by SHA-256, is the
   acceptance bar for `fixed-pdf` export/download.
5. **The private source PDF is never reachable except through an
   authenticated, ownership-checked server route.**

## Architecture

```
DocumentMode = 'editable' | 'fixed-pdf'

editable (existing, unchanged):
  file -> extractImportedDocumentSeed -> chapters/blocks -> compose() -> preview/export

fixed-pdf (new):
  file --+--> Blob (access: 'private') ---------------------+
         |                                                   +--> GET /api/projects/[id]/source-pdf
         +--> extractImportedDocumentSeed (same pipeline,     |     (auth + ownership, streams original bytes)
              sidecar only: title/subtitle/author/outline)    |          ^                        ^
                                                               |     FixedPdfPreview          Export PDF route
                                                               |     (pdfjs-dist canvas)       (bypasses buildProjectPdfWithConfig,
                                                               +-----------------------------  returns original bytes)
```

`composeProjectPreview()` (the universal chokepoint for preview + PDF/DOCX/
EPUB export today) is never invoked for `fixed-pdf` content. This is
consistent with `sdd/product.md`'s explicit non-goal, "Full-fidelity
PDF-to-editable reconstruction" — `fixed-pdf` mode leans into that boundary
instead of working around it, and is documented here as the single,
explicit exception to `sdd/architecture.md`'s "one canonical project model"
rule: the exception is the original PDF binary itself, referenced (not
duplicated) from the canonical `ProjectRecord` via `ProjectAsset` +
`document.source`, per `sdd/data-model.md`'s "binary files live in Blob;
Postgres stores metadata and references" rule.

## Data model

No migration. `project_documents.source_metadata` (jsonb) already stores the
whole `ProjectDocument.source` object.

```ts
type DocumentMode = 'editable' | 'fixed-pdf';

interface ProjectDocumentSource {
  fileName: string;
  mimeType: string;
  importedAt: string;
  mode?: DocumentMode;        // new; undefined => 'editable'
  pageCount?: number;         // existing
  outline?: EditorialMapEntry[]; // existing
  sizeBytes?: number;         // new
  sha256?: string;            // new
  sourceAssetId?: string;     // new
}
```

`ProjectAsset` (existing shape, `usage: 'source-document'`) gets a real,
non-null `blobUrl` for `fixed-pdf` projects (private blob path/URL). For
`editable` projects the asset is created exactly as it is today
(`blobUrl: null`, unchanged behavior/regression-tested).

Canonical helpers (single source of truth, no MIME sniffing in components):

```ts
function isFixedPdfProject(project: ProjectRecord): boolean;
function isEditableProject(project: ProjectRecord): boolean;
```

## Storage

- `access: 'private'` on `@vercel/blob` `put()` is attempted first
  (supported in the installed `@vercel/blob@2.3.2`'s API). **Confirmed via
  a real upload attempt against this project's actual Blob store** (not
  assumed): the store is provisioned public-only and rejects it —
  `Vercel Blob: Cannot use private access on a public store. The store
  must be configured with private access.` `uploadPrivateProjectDocument`
  catches this and falls back to `access: 'public'` (still
  random-suffixed), logging the fallback loudly and persisting which
  strategy was actually used as `document.source.sourceAccessLevel`
  (`'private' | 'public-proxy-only'`). This is the mission-sanctioned
  minimum viable secure option, not a silent downgrade: the URL is still
  never sent to any client in either case — only `fetchPrivateProjectDocument`
  (server-side) ever reads it, and only through the ownership-checked
  routes below. `fetchPrivateProjectDocument` branches on the persisted
  `sourceAccessLevel` (SDK `get()` for `'private'`, a plain server-side
  `fetch()` for `'public-proxy-only'`) rather than probing on every read.
  **Open item:** provisioning an actual private Blob store for this Vercel
  project would close this gap; that is an infrastructure change outside
  this feature's authority and is called out to the user separately.
- New helper alongside `uploadProjectBlob` in `src/lib/blob/client.ts`,
  dedicated to the source PDF, so every existing public-blob caller
  (cover/back-cover/chapter images) is untouched.
- SHA-256 computed at import time (`sha256Buffer`, Node `crypto`), persisted
  in `source.sha256`, used as the acceptance check for byte-identical
  export.

## Security

- New route `GET /api/projects/[projectId]/source-pdf`:
  - `requireUserId()` — same auth primitive as sibling `export/pdf` and
    `export/epub` routes.
  - `projectRepository.getProjectById(userId, projectId)` scoped by
    `userId` — `404` for both "doesn't exist" and "not yours" (matches this
    repo's existing convention; there is no 403 pattern anywhere in it).
  - `404` (distinct message) when the project has no `source-document`
    asset or an empty `blobUrl` (legacy/editable projects, or an incomplete
    fixed-pdf upload).
  - Fetches via `@vercel/blob`'s `get(pathname, { access: 'private' })` —
    the private blob is never reachable by an unauthenticated client, and
    its URL is never sent to the browser directly.
  - Response carries `Content-Type: application/pdf` and
    `X-Content-Type-Options: nosniff`; `Content-Disposition` is `inline`
    by default (viewer) or `attachment; filename=...` when `?download=1`
    (export/download action).
  - No `dangerouslySetInnerHTML`, no text-extraction-based rendering of the
    original PDF anywhere in the viewer.

## Preview

New `FixedPdfPreview` client component (no PDF viewer existed in this repo
before this feature): fetches the authenticated route, renders pages with
`pdfjs-dist` onto `<canvas>`, page navigation, loading/error states,
responsive (no shell horizontal overflow), theme-safe (only the chrome
around the canvas responds to light/dark — the rendered PDF content itself
is never altered, recolored or reflowed).

**Worker asset gotcha, caught by an actual `next build`, not assumed:**
this repo's `next.config.ts` already lists `pdfjs-dist` in
`serverExternalPackages` (for the unrelated server-side `pdf-parse` path —
see `pdf-import-structural-recovery`). That collided with resolving
`pdfjs-dist`'s worker for this feature's **client** bundle: Turbopack
warned `Package pdfjs-dist can't be external` and silently did not emit
the worker chunk (confirmed missing from `.next/static/chunks`). Fixed by
serving the worker as a plain static file — `postinstall` copies
`node_modules/pdfjs-dist/build/pdf.worker.min.mjs` to
`public/pdf.worker.min.mjs`, and `FixedPdfPreview` points
`GlobalWorkerOptions.workerSrc` at that same-origin path — instead of a
bundler-resolved `new URL(...)` reference, which is what triggered the
collision. Verified working end-to-end (canvas actually renders pages) via
a real Playwright run against `next dev`, not just a clean build.

## Export

`GET /api/projects/export/pdf`: immediately after fetching `project`, if
`isFixedPdfProject(project)`, fetch the original bytes (same private-blob
`get()` call as the source-pdf route) and return them directly.
`buildProjectPdfWithConfig` / `renderToBuffer` / `composeProjectPreview` are
never invoked on this branch — enforced by a regression test that mocks
`export-builder` and asserts it is not called for a `fixed-pdf` project.

`GET /api/projects/export/docx` and `.../export/epub`: both reflow content
through `composeProjectPreview`, which is meaningless (and would be
misleading) for a fixed layout. Both return `409` with a clear error body
for `fixed-pdf` projects; the UI disables the corresponding export actions
with an explanatory tooltip rather than letting the user trigger a
misleading result.

## UX / workspace

- Import: a mode selector (radio group) appears only when the selected file
  is a PDF — `fixed-pdf` ("Conservar PDF original" / "Keep original PDF")
  recommended/default, `editable` ("Convertir a documento editable" /
  "Convert to editable document") as the alternative. Non-PDF formats are
  unaffected — no selector shown, existing flow untouched.
- Workspace: chapter/template/cover/back-cover steps are not forced for
  `fixed-pdf` — they render an "Incluido en el PDF original" / "Included in
  original PDF" informational panel instead of the real editor. Preview
  step renders `FixedPdfPreview`. Export step always offers "Download
  original PDF"; DOCX/EPUB export actions are disabled with a tooltip.
  Collaboration and AI steps remain enabled (they operate on sidecar
  metadata, not on the composed document — safe per the invariants above).
- `DocumentDataModal`: title/subtitle/author/language/confidence badges
  stay visible for `fixed-pdf`; composition/margin controls are hidden or
  clearly labeled as not applicable — never silently ignored.
- `EditorialMapPanel` (a 3-column detected/edited/paginated diff) is hidden
  entirely for `fixed-pdf` — its premise (an editable chapter pipeline)
  doesn't exist in this mode.
- `DocumentStatsCard`'s "Capítulos" tile is suppressed/relabeled for
  `fixed-pdf` (would otherwise show a misleading `0`); page count is read
  from `source.pageCount` instead.

## Compatibility

- Every `editable` code path (DOCX, DOC, TXT, MD, and PDF-as-editable) is
  byte-for-byte unchanged: same functions, same call sites, same behavior.
  `mode` only branches at the points listed above; no existing conditional
  in `factories.ts`, `compose.ts`, or the export builders is touched for
  the editable case.
- Legacy projects (`source.mode` absent) behave as `editable` everywhere —
  covered by a repository round-trip test loading a hand-crafted legacy row.
- `import/route.ts` (analysis) is unchanged: the same `extractImportedDocumentSeed`
  output is reused for both modes; `mode` only changes how the result is
  *persisted and rendered*, never how it is *analyzed*.

## Test matrix

Unit: `DocumentMode` default-to-`editable`; `isFixedPdfProject`/
`isEditableProject`; `sha256Buffer`; factory behavior for both modes
(real vs. null `blobUrl`); repository round-trip (`fixed-pdf` persisted
fields survive; legacy row with no `mode` loads as `editable`).

Route: `source-pdf` — unauthenticated, project-not-found, not-owner
(collapses to the same 404 as not-found, per repo convention), no source
asset, success (headers + streamed bytes, `@vercel/blob` mocked). `export/pdf`
— `fixed-pdf` bypasses `buildProjectPdfWithConfig` (asserted not called),
`editable` regression-unaffected. `export/docx`/`export/epub` — `fixed-pdf`
returns `409`, `editable` regression-unaffected.

Component: `DocumentImporter` — PDF shows the mode selector
(fixed-pdf default), DOCX does not. `ProjectWorkspace` — `fixed-pdf` does
not force `CoverStudio`/`BackCoverStudio`, renders `FixedPdfPreview`,
disables DOCX/EPUB export; `editable` behavior is a straight regression
check.

E2E: login -> new project -> upload PDF -> select fixed-pdf -> analysis ->
create -> workspace -> preview -> export -> SHA-256 identity, gated behind
`E2E_PROD_EMAIL` / `E2E_PROD_PASSWORD` / `E2E_FIXED_PDF_PATH` env vars, no
credentials committed.

## Acceptance criteria

See mission §44 for the full checklist. The two non-negotiable technical
bars: `SHA256(uploaded) === SHA256(exported)` for every `fixed-pdf` project,
and zero regression in any existing `editable`/DOCX/legacy-project test.

## Rollback considerations

Additive: a new optional field on an existing jsonb column, a new route, a
new component, and early-return guards in three existing export routes. No
schema migration, no destructive change to any existing table or code path.
Reverting this feature's commits restores prior behavior with no data loss
for `editable` projects; any `fixed-pdf` project created in the meantime
would need its now-orphaned private blob cleaned up manually (documented
here, not automated, since it is out of scope for this feature).
