# Composition Engine (FASE C) — Semantic Document Model + Rule-Based Pagination

Status: **engine core implemented** (model, adapters, composer, rules, tests). UI panels,
persistence migration, live preview wiring, reimport merge and e2e are pending (see
"Pending work" at the end).

## Governing principle

The document is never "paginated", it is **composed**. Pagination is a derived,
deterministic projection: `content + rules + template → composedPages`. The author edits
content and rules; the system recomposes only what is affected. Preview and export must
both consume the same engine output.

## 1. Semantic document model — `src/lib/document/`

Canonical typed block tree (`model.ts`):

- Blocks: `heading(level 1-6)`, `paragraph`, `list(ordered)`, `table(rows, hasHeader, caption)`,
  `image(src, alt, caption, estimatedLines)`, `quote`, `callout(kind)`, `code(language)`, `pageBreak`.
- Inline: `text` with marks (`bold`, `italic`, `link`) and **live `ref` tokens**
  (`refKind: chapter|figure|table`, `targetId`) that are materialized as numbers by the
  composer, never stored as plain text.
- `DocumentMetadata` (title, subtitle, author, isbn, description, keywords, language) lives
  in the model (C7) as the single source later injected into front matter, TOC, footer and
  export; cover-studio will read it via the model in a later phase.
- Every block has a stable `id`; `ensureBlockIds` derives deterministic ids from content
  hashes so incremental recomposition and structural matching can anchor on them.
- Plain JSON-serializable objects only (no classes/Maps) → persistable as JSONB.

Adapters (existing projects need **no data migration** — lazy adaptation):

- `from-html.ts` — `htmlToBlocks(html)` / `htmlToDocument(chapterHtmlList, metadata)` parse
  the existing TipTap/preview HTML dialect (headings, p, ul/ol, table, blockquote, pre,
  img/figure, `<hr data-page-break>`) into blocks. Ref tokens arrive as
  `<span data-ref-kind data-ref-target>`. Unknown markup degrades to paragraphs, never throws.
- `to-html.ts` — `blocksToHtml` / `documentToHtml(refs?)` serialize back to the same HTML
  dialect, materializing ref tokens with the labels from the last composition. This keeps
  the editor, preview flow and export builder working unchanged during the transition.

## 2. Composition engine — `src/lib/compose/compose.ts`

`compose(document, rules, template, measurer?) → ComposeResult` is **pure and
deterministic**: no DOM, no globals; same input → identical output (tested).

- `ComposeTemplate`: page size, margins, base font size, line height, `chapterLevel`
  (heading level that opens a chapter, default 1), `tocDepth` (default chapterLevel+1).
- Measurement goes through the `TextMeasurer` port (`measure.ts`):
  - `createCanvasMeasurer(fontFamily)` — real font metrics in the browser
    (`CanvasRenderingContext2D.measureText`, project fonts already loaded via next/font).
  - `createServerMeasurer()` — deterministic server-equivalent for export.
  - `createHeuristicMeasurer()` — fallback used by tests/SSR.
- All blocks are measured in **base lines**; page capacity = floor(usable height / line px).
- Chapters always begin on a page boundary — this invariant is what makes incremental
  recomposition exact.

Output (`ComposeResult`):

- `pages`: block placements per page (`fromLine/toLine` for split paragraphs,
  `fromItem/toItem` for split lists), materialized `pageNumber`, blank padding pages.
- `toc`: **100% generated** from the heading structure on every run; never editable.
- `figures` / `tables`: numbering per block id, optionally restarted per chapter (`n.m`).
- `refs`: resolved cross-reference labels keyed by targetId.
- `violations`: `{ page, blockId, rule, message }` for the document-health panel (C4).

### Incremental recomposition

`composeIncremental(previous, document, changedBlockId, rules, template, measurer?)`:
locates the chapter containing the changed block, **reuses pages from earlier chapters
verbatim** and recomposes only from the affected chapter forward, then rebuilds the global
indexes (TOC, numbering, refs). Unknown block id (structural change: paste, reimport) →
full compose fallback. Tested invariant: `composeIncremental(...) ≡ compose(...)` (also
with odd-page chapter starts). This is the mechanism behind the <300 ms preview budget:
only one chapter's measurement/pagination runs per keystroke (with debounce in the wiring
phase).

## 3. Declarative rules — `src/lib/compose/rules.ts`

`DocumentRules` (JSON per project, persistence pending):

```
keepTogether: { table, tableFillGap: 'next-float'|'leave-space',
                list: { maxItems }, code, quote, callout, imageWithCaption }
keepWithNext: { headingLevels, minLinesAfter }
widowsOrphans: { minLines }                    // default 2
chapterStartsOnOddPage                         // print
pageBreakBeforeChapter                         // digital
numbering: { restartFiguresPerChapter, restartTablesPerChapter, pageNumberFormat }
```

`defaultDocumentRules` are the sensible presets, active out of the box;
`resolveDocumentRules(partial)` deep-merges persisted rules over them.

### Rule priority table (explicit conflict resolution)

| # | Rule | Behaviour when conflicting |
|---|------|-----------------------------|
| 1 | explicit `pageBreak` block | always closes the page |
| 2 | `chapterStartsOnOddPage` / `pageBreakBeforeChapter` | pads a blank page if needed |
| 3 | `keepWithNext` (heading + `minLinesAfter`) | heading travels to the next page |
| 4 | `keepTogether` (table > imageWithCaption > code > quote > callout > list) | whole block jumps; `tableFillGap: 'next-float'` pulls following paragraphs into the gap |
| 5 | `widowsOrphans.minLines` | paragraph moves whole if a side would be too short |

Lower priorities never override higher ones. If the top rule is itself impossible (e.g. a
table taller than a page with `keepTogether.table`), the block is split **and a violation
is emitted** — a rule is never silently dropped.

## 4. Violations (document health, C4)

The composer returns `violations` on every run; the health panel, workspace counter and
configurable export gate (block vs warn) are pending UI work consuming this array.

## 5. Regression gate — tests

- `src/lib/compose/compose.test.ts` (16 tests): table at page bottom not split; oversized
  table → violation; 3-item list jumps whole; long list splits between items; heading never
  last on page; widows/orphans (move + clean split); TOC generated; cross-ref renumbering
  on insertion; TOC page numbers shift; determinism; odd-page padding; incremental reuses
  prefix pages; **incremental ≡ full compose** (plain and odd-page); unknown-block fallback.
- `src/lib/document/document.test.ts` (7 tests): HTML→blocks mapping, marks, tables,
  figures, ref tokens, stable ids, round-trip serialization with resolved refs.

## Status after round 2 (what landed)

1. **Persistence ✅** — `project_documents` gained `rules` / `document_model` / `metadata`
   JSONB columns (`schema.ts`, applied to dev DB via `ensure-migrations.js` — the neon
   tagged-template call was fixed in the same pass). Read/write through `repositories.ts`
   (`saveDocumentExtras`, `replaceDocument`), factory `updateProjectDocumentExtras`, and
   actions `saveProjectRulesAction` / `saveProjectMetadataAction` /
   `saveProjectDocumentModelAction` / `reimportProjectAction`.
2. **Preview/export adapter ✅** — `src/lib/compose/preview-adapter.ts`:
   `composeProjectPreview(project, config, measurer?) → { pages: PreviewPage[], result }`,
   drop-in for `buildPreviewPages` (cover=1, content 2+, back-cover last; project chapters
   never share a page via `ComposeOptions.chapterStartIds`; generated TOC replaces the TOC
   chapter with the `data-toc-*` contract; refs materialized; `buildComposedFlowHtml` for
   `MultipageFlow`). `pageIndexOffset: 1` makes printed numbering include the cover, so
   `chapterStartsOnOddPage` refers to recto printed pages. Split paragraphs are
   reconstructed as plain-text fragments via `wrapTextLines` (marks flattened only inside
   split fragments).
3. **Rules panel ✅** — `DocumentRulesPanel` in the Content step: presets
   default/print/digital, every rule adjustable, persists via server action. i18n ES/EN.
4. **Health panel + export gate ✅** — `DocumentHealthPanel` (always-visible counter,
   violation list with page references linking to preview) and the per-project gate
   (`rules.exportGate: 'off'|'warn'|'block'`, default `warn`) enforced in the Export step
   (block disables actions, warn shows a notice).
5. **Metadata injection ✅** — `ProductMetadataPanel` (ISBN/description/keywords/language;
   title/subtitle/author carried from the document) and adapter injection of portadilla +
   legal page after the cover when extended metadata exists; TOC numbers shift accordingly.
6. **DOCX reimport ✅ (lib + action)** — `src/lib/projects/reimport.ts`:
   `mergeReimportedSeed` matches chapters by normalized title anchors, updates only changed
   chapters (ids/positions preserved), appends new ones, keeps missing ones, never touches
   cover/backCover/rules/metadata; content-derived stable block ids make it idempotent.
   `reimportProjectAction` persists and returns the merge summary.

## Status after round 3 (what landed)

1. **Export consumption ✅** — `buildExportPreview` (`export-builder.tsx`), `PdfExportButton`
   and `PreviewModal` all consume `composeProjectPreview`; the adapter is the single
   pagination source for preview and export.
2. **Live preview (C5) ✅** — `useDocumentComposition` recomposes on every project change:
   `composeProjectPreviewIncremental` (`preview-adapter.ts`) reuses unaffected leading pages
   via `composeIncremental` (fixed reused-page slice/reindexing) and falls back to a full
   compose when the change is not localizable. `diffCompositions` (`compose.ts`) produces
   `{chapterShifts, tocDelta, newViolations, pageCountDelta}`; `DocumentHealthPanel` shows a
   recompose badge (`document-health-recomposed-badge`, first recomposed printed page) and a
   before/after diff banner (`document-health-diff`). Debounce happens upstream in
   `useChapterEditor` (the hook recomputes on the already-debounced project state). Undo of
   the diff was descoped: the banner is informational only.
3. **Reimport UI ✅** — "Reimportar" button in the Chapters step opens `ReimportDialog`:
   upload → `/api/projects/import` analysis → `summarizeReimport` structural diff preview
   (update/add/keep counts) → confirm → `reimportProjectAction` merge summary.
4. **Client canvas measurer ✅** — `createCanvasMeasurer` is injected in the browser path
   (`useDocumentComposition`, `PreviewModal`); server and tests keep the deterministic
   measurer.
5. **Footer injection (C7) ✅** — running footer with document title + printed page number
   in the HTML export surface.
6. **e2e Playwright ✅** — `e2e/composition-engine.spec.ts`: rules panel edit+persist,
   health counter, full reimport flow with diff preview, against a production build
   (`BASE_URL=http://localhost:3100`). Archived regression test formalized as
   `src/lib/projects/actions.pagination.test.ts`.

## Pending work (next phase/agent)

- **Undo for live-preview diffs**: the C5 diff banner is informational; reverting a
  recomposition from the UI was descoped.
- **Cover-studio via the model**: cover/back-cover still read the legacy fields; wiring them
  to `DocumentMetadata` is a later phase.

