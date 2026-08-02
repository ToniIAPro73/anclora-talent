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

## Pending work (next phase/agent)

1. **Persistence**: Drizzle migration adding `rules`/`documentModel`/`metadata` JSON(B)
   columns to the project graph (`src/lib/db/schema.ts`, `repositories.ts`), npm script +
   `ensure-migrations.js` entry. Lazy migration: keep reading HTML chapters, adapt via
   `htmlToDocument`, persist the model on next save.
2. **Rules panel** ("Reglas del documento") in `ProjectWorkspace` with i18n ES/EN
   (`src/lib/i18n/messages.ts`), presets togglable, `ac-*` classes only.
3. **Health panel** + always-visible violation counter + export gate config per project.
4. **Live preview**: debounce → `composeIncremental`, recompose badges, before/after diff
   dialog for big changes, undo.
5. **DOCX reimport**: structural merge by stable heading/anchor ids
   (`import-pipeline.ts` keeps trusting only real `<h1>-<h6>` from Mammoth — archived
   decision), preserving cover/back-cover/rules/manual tweaks.
6. **Export integration**: adapter `ComposeResult → PreviewPage[]` so
   `export-builder.tsx`/`PreviewModal` consume the engine (contract: `PreviewPage`,
   `PaginationConfig`, `<hr data-page-break>`, TOC `data-toc-*` spans).
7. **e2e Playwright**: rules panel, health panel, reimport flow.
8. Formalize archived regression test `Archive/scripts_and_tests/actions.pagination.test.ts`
   into `src/lib/projects/`.
