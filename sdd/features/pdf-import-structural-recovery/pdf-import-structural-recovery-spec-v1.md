# PDF import structural recovery — spec v1

## Problem

Importing an editorial PDF (regression case: `El_Plan_de_Escape_EBOOK.pdf`, 122
pages) produces wrong metadata and a collapsed structure:

- Title falls back to the filename ("El Plan de Escape EBOOK") instead of the
  real two-line cover title.
- Author is empty even though the copyright page states it clearly.
- Only 1 chapter is detected instead of the book's 14 primary editorial
  units (Prólogo, Introducción, 10 numbered chapters, Epílogo, Apéndice).
- Confidence is reported as "low" across the board despite strong evidence
  being present in the source.

## Scope

- `extractTextFromBuffer` (PDF branch) and the whole detection pipeline in
  `src/lib/projects/import-pipeline.ts`.
- Unit tests in `src/lib/projects/import.test.ts` (and a new focused suite).
- A synthetic regression fixture generated at test time (no real ebook
  committed to the repo).
- Manual/local acceptance against the real PDF, gated behind an env var.

## Non-goals

- OCR / scanned-PDF recovery (F2/FileStudio territory, already covered
  elsewhere; this change must not regress it).
- AI-assisted structural recovery (explicitly out of scope per product
  policy — detection must stay deterministic).
- Full-fidelity PDF-to-editable reconstruction (out of MVP scope per
  `sdd/product.md`).
- Redesigning the analysis UI beyond making it reflect corrected data.

## Current failure — root causes

Diagnosed by running the real `pdf-parse@2.4.5` output (both `parser.getText()`
and its `.pages[]` per-page array) and then the actual
`buildImportedDocumentSeed` pipeline against the real PDF's extracted text
(see the diagnostic scripts used during triage, removed before commit).

1. **Page-joiner corruption (root cause, most severe).**
   `extractTextFromBuffer` calls `parser.getText()` with no parameters. The
   installed `pdf-parse` version defaults `pageJoiner` to
   `'\n-- page_number of total_number --'`, so the concatenated `parsed.text`
   the pipeline consumes contains a literal `-- N of 122 --` line inserted,
   blank-line-delimited, between **every** page. Confirmed in the raw text:
   `"...tu vida\n\n-- 2 of 122 --\n\nEste libro..."`. This single defect
   cascades into nearly every symptom below: the garbage line is short,
   not decorative-only by the existing filter, and not a copyright/author
   match, so it wins `findTitleCandidate` ahead of (or gets spliced into) the
   real title/subtitle candidates. Running the actual pipeline against the
   real PDF confirmed the resulting title was literally `"-- 1 of 122 --"`.

2. **Running headers/folios are not detected or stripped.** Every content
   page repeats `"El Plan de Escape de la Mediana Edad"` as a running header
   and `"— N —"` as a folio. Neither matches the existing decorative-line
   filter (`isDecorativeLine` only strips lines made purely of `─—–_=*·.`
   characters — a folio like `"— 12 —"` contains digits, so it survives) nor
   any heading pattern, so both get folded into ordinary body paragraphs on
   every single page, corrupting paragraph boundaries throughout the book.
   The installed `pdf-parse` exposes page-aware text (`TextResult.pages:
   Array<{ num, text }>`), which the pipeline never uses.

3. **Letter-tracked chapter headings are invisible to detection.** Chapter
   openers use justified/tracked typography: `"C A P Í T U L O 1"`. This
   matches neither `MAJOR_HEADING_RE` (expects `capítulo` as one token) nor
   `ALL_CAPS_RE` (requires 40+ characters; the tracked marker is far
   shorter). The heading is silently absorbed into body text.

4. **No marker → title lookahead.** Even for an *untracked* `"Capítulo 1"`
   marker line followed by the real chapter title on the next line(s), the
   pipeline had no mechanism to treat the marker as a boundary trigger and
   pull the following short line(s) in as the chapter's actual title — the
   marker line itself would have become the (wrong) chapter title.

5. **Author detection is DOCX-only.** `extractAuthorFromText` only matches a
   whole line wrapped in `**bold**`/`__bold__` markdown — an artifact of the
   mammoth DOCX→HTML→markdown path. Plain-text/PDF sources have no such
   markup, so author extraction always returns `''` for PDF, even though the
   copyright line (`"© 2026 Antonio Ballesteros Alonso"`) is unambiguous.

6. **Front-matter title/subtitle are never split.** `"EL PLAN DE ESCAPE"` /
   `"DE LA MEDIANA EDAD"` (title, two lines, all caps) and `"Cómo
   desatascarte profesionalmente"` / `"sin dinamitar tu vida"` (subtitle, two
   lines, mixed case) have no blank line between them in the source, so
   line-based parsing has no structural reason to draw a boundary between
   "title" and "subtitle" beyond a capitalization-transition heuristic that
   did not previously exist.

7. **Table of contents is parsed but never reconciled with the body.** The
   TOC page is extracted as a block of text but is never used as evidence to
   validate, recover, or de-duplicate chapter boundaries detected in the
   body — even though it is the highest-quality structural signal available.

8. **`MAJOR_HEADING_RE` is missing `apéndice`.** The closing "Apéndice:
   Herramientas y ejercicios" unit has no matching alternative (only
   `anexos?` exists, a different word), so it never becomes a heading on its
   own even when correctly isolated.

9. **(Most fundamental) `pdf-parse`'s worker script is not resolvable in
   the Next.js production bundle.** Independent of every detection-logic
   issue above, and the more direct explanation for the exact symptom in
   the bug report (title silently falling back to the filename): `pdf-parse`
   imports `pdfjs-dist` directly, which resolves its `pdf.worker.mjs`
   companion via a relative path next to wherever `pdf.mjs` was loaded
   from. Turbopack bundles that import into a single server chunk under
   `.next/server/chunks/`, and no `pdf.worker.mjs` exists at that path, so
   in a production build (`next build && next start`) every PDF import
   throws `Cannot find module '.../chunks/pdf.worker.mjs'` — caught by
   `extractTextFromBuffer`'s existing try/catch, which degrades to the
   empty-shell/`parseFailed: true` path (see `import.ts`). This reproduces
   silently: `next dev` and a raw Node script (both used during initial
   triage) do not hit this bundling behavior, so it was invisible until the
   fix was verified against a real production server.

None of these are specific to this book — they are generic editorial-PDF
conventions (letter-tracked chapter openers, running headers/folios, cover
title/subtitle split across lines, copyright-line authorship, a table of
contents) reproducible from Word, Google Docs or InDesign-style PDF exports.

## Architecture

```
RAW PAGE TEXT (pdf-parse, page-aware)
        |  strip running headers/footers/folios (page-frequency signal)
        v
CLEANED DOCUMENT TEXT (paragraph-safe page joins, no joiner artifacts)
        |  normalizeText (unchanged)
        v
NORMALIZED DETECTION VIEW  <-- normalizeTrackedHeading (detection-only,
        |                      never mutates stored block text)
        v
STRUCTURAL SIGNALS  <-- isStrongStandaloneHeadingSignal / chapter-marker +
        |                lookahead title merge / insideToc TOC-line guard
        v
METADATA + OUTLINE  <-- detectTitleFromFrontMatter / detectSubtitleFromFrontMatter /
        |                detectAuthorFromFrontMatter / computeImportConfidence
        v
CANONICAL IMPORT SEED (ImportedDocumentSeed) — unchanged shape
```

This is one layer of the fix; the other, independent and more fundamental,
is at the extraction runtime itself (`next.config.ts`) — see "Current
failure — root causes" #9 and "Compatibility" below.

Concretely, in `import-pipeline.ts`:

- `extractTextFromBuffer` (PDF branch): request page-aware text
  (`parser.getText()`, using `result.pages`), strip running headers/folios
  per page using a page-frequency signal, and join cleaned pages with a
  plain paragraph break (`\n\n`) instead of relying on the library's default
  `pageJoiner` string.
- `normalizeTrackedHeading(line)`: collapses letter-tracked runs
  (`"C A P Í T U L O 1"` → `"CAPÍTULO 1"`) for detection only; used inside
  the heading classifiers, never applied to stored block text.
- `parseTextBlocks`: chapter-marker lines (`"Capítulo N"` / `"Chapter N"` /
  `"Parte N"` with **no** trailing title text) trigger a bounded lookahead
  (`consumeHeadingContinuationLines`) that merges the following short,
  non-terminal-punctuated line(s) into the chapter's actual title — mirrors
  the existing multi-line front-matter title/subtitle heuristics.
- `detectAuthorFromFrontMatter` / a new `extractAuthorFromCopyright`:
  recovers an author name from `© YEAR Name` / `By Name` / `Por Name`
  patterns when the DOCX-bold heuristic finds nothing, with care to reject
  companies, URLs and legal boilerplate.
- `detectTitleFromFrontMatter` / `detectSubtitleFromFrontMatter`: gains a
  capitalization-transition rule so consecutive ALL-CAPS front-matter lines
  merge into the title and the following mixed-case lines merge into the
  subtitle, stopping at the author/copyright block.
- TOC-as-evidence (implemented as prevention, not post-hoc reconciliation —
  see "TOC reconciliation" below): an `insideToc` state in `parseTextBlocks`
  keeps a detected table of contents' own lines ("Prólogo 6", "Epílogo 110")
  from ever being misclassified as standalone headings in the first place,
  so the index can never spawn a duplicate "chapter" alongside the real
  body heading it is describing.
- `computeImportConfidence`: unchanged tiers (`high`/`medium`/`low`), but the
  underlying signals it reads become trustworthy, so a genuinely
  well-evidenced import now reports `high` instead of defaulting `low`.

## Normalization rules (detection-only)

- Letter-tracked line: tokens split on whitespace, ≥4 tokens, ≥70% of tokens
  are exactly one character. Consecutive single-letter tokens collapse into
  one word; a numeral token stays a separate token (so `"CAPÍTULO 1"` keeps
  its space and still matches `MAJOR_HEADING_RE`'s trailing `\b`).
- Chapter-marker line: `^(?:capítulo|chapter|parte|fase|sección)\s*\d+[.:]?\s*$`
  after tracked-heading normalization, matched with **nothing else** on the
  line — a marker with inline title text (`"Capítulo 3: El suelo
  financiero"`) is left to the existing single-line heading path unchanged.
- Heading continuation (title lookahead): up to 2 following non-blank lines,
  each ≤ 8 words and not ending in terminal sentence punctuation, are
  merged with a single space into the chapter title; the scan stops at the
  first line that fails either condition, at a blank line, or at another
  detected heading/marker.
- Folio line: `^—?\s*\d+\s*—?$` (any dash style) on its own line — always a
  candidate for stripping regardless of frequency, since a folio's digits
  differ per page by definition.
- Running header: exact-text match on a page's first (or last) non-blank
  line repeated on ≥ 40% of pages (minimum 3 occurrences) — only removed
  when it recurs in that boundary position; a genuine front-matter title is
  never removed because it appears once, not repeatedly at a page boundary.

## Metadata detection

- **Title**: prefer a front-matter candidate; merge consecutive ALL-CAPS
  lines before the capitalization transition. Fallback order: detected
  front-matter candidate → first document paragraph → filename.
- **Subtitle**: mixed-case front-matter lines following the title, stopping
  at author/copyright; multiple short lines join with a space (not `·`,
  which read as a visual list separator rather than a real subtitle).
- **Author**: byline-style line in front matter (unchanged), else
  `© YEAR Name` / `by Name` / `por Name` copyright extraction, rejecting
  matches that look like a company/imprint (`S\.?L\.?`, `Inc\.?`, `Ltd\.?`,
  `Editorial`, a URL, or lack of a space-separated multi-word person name).

## TOC reconciliation

Revised during implementation from a post-hoc `detectTableOfContents` +
`reconcileOutlineWithToc` pass to prevention at the source, once the actual
failure mode was isolated: TOC lines like `"Prólogo 6"` / `"Epílogo 110"` /
`"Apéndice: Herramientas y ejercicios 114"` independently satisfy
`MAJOR_HEADING_RE` (they start with a real heading keyword), so — once
page-aware extraction stopped burying them inside one giant front-matter
blob — they were being detected as standalone headings and spawning
duplicate chapters of their own, one per TOC line.

`parseTextBlocks` tracks `insideToc`: set to `true` right after a heading
whose cleaned text satisfies `isTocChapterTitle` (an "Índice"/"Contents"
heading), cleared at the next blank line (a page boundary, after page-aware
extraction — TOC content that continues past a page break is a known,
documented limitation) or once a genuine chapter-marker/heading is
resolved. While `true`, a short, non-terminal-punctuated line is kept as a
list item (`looksLikeTocContinuation`) instead of being re-classified as a
heading, and `isLikelyIndexEntry`'s bare-keyword branch is gated by it too
(`allowBareKeyword: insideToc`, PDF mode only — the pre-existing
unconditional behavior for markdown/DOCX text mode is unchanged, since a
regression test depends on it). Separately, `isPotentialHeadingLine` (also
PDF-mode-only) protects the reverse case: a colon-titled real heading
("Capítulo 3: El suelo financiero") appearing *outside* TOC context must
never be swallowed by the colon-based index-entry heuristic just because it
also has a colon.

Net effect: the table of contents is used as evidence by *not competing*
with the body's own headings — its entries never independently become
chapters, so there is nothing to de-duplicate or merge after the fact. This
is simpler and lower-risk than the originally planned reconciliation pass,
at the cost of not recovering a body heading's fuller title from a richer
TOC label when the body-side lookahead under-captured it; the marker +
lookahead mechanism (§4.1) already recovers the full title directly from
the body in every case observed in the real regression PDF, so this gap is
a documented limitation, not an unaddressed failure mode.

## Header/footer policy

Page-aware detection (see Normalization rules) strips running headers and
folios before block parsing ever sees them, rather than trying to filter
them out after the fact from a flattened string. A line that only *looks*
like the title but appears once, in real front matter, is untouched — the
removal rule keys off **repetition at a page boundary**, not text content.

## Confidence policy

Unchanged tiers and unchanged computation function signature; the fix is
that the inputs it depends on (`titleFoundCandidate`, `author`, `chapterCount`)
now reflect reality instead of parser corruption. No new confidence tier is
introduced.

## Compatibility

- DOCX (`mammoth` HTML path) is untouched: `parseHtmlBlocks` / TOC-list
  merging code is not touched by this change.
- TXT/MD (`default` text mode) is untouched: the new marker+lookahead logic
  only activates in `pdf` text mode; `mode === 'default'` keeps using
  `isLikelyStandaloneHeading` exactly as before.
- Scanned-PDF/OCR (F2/FileStudio) path is untouched: `isScannedPdfSource`
  and the OCR runner hook in `import.ts` are not modified; OCR text still
  flows through the same `buildImportedDocumentSeed` call.
- `manuscriptTypeOverride` behavior is untouched (same override map, same
  fallback to auto-detection).
- `next.config.ts`'s `serverExternalPackages` gains `pdf-parse` and
  `pdfjs-dist`, alongside the pre-existing `@sparticuz/chromium` /
  `playwright-core` / `@playwright/test` / `sharp` entries — same
  established pattern (a package with runtime asset resolution that breaks
  under bundling must be required from `node_modules` directly). This
  changes nothing about how any *other* route imports these packages; it
  only stops Turbopack/webpack from bundling them into a server chunk.
  Verified against a real `next build && next start` server.

## Security considerations

- No new logging of manuscript content; diagnostic scripts used during
  triage are removed before commit (test-only/local-only per repo rule).
- No new external calls, no AI usage in the base detection path (policy:
  deterministic detection stays deterministic).

## Performance constraints

- Running-header/folio detection is O(pages): one pass to build a frequency
  map, one pass to strip. No cross-page or cross-line O(n²) comparison.
- TOC reconciliation uses a normalized-key `Map`, not nested scans over
  every body line.
- No additional full PDF re-parse; a single `getText()` call is reused.

## Acceptance criteria

See task prompt §8 for the full expected fixture values (title, subtitle,
author, manuscript type, 14 primary structural units, no duplicate TOC
chapters, no running-header/folio pollution, content integrity, no HTTP 500
through import → project → editor).

## Test matrix

Unit (`import.test.ts` + a new `import-pipeline.pdf-structure.test.ts`):
tracked heading (ES/EN), short ALL-CAPS heading, heading false-positive,
multiline title, multiline subtitle, author from copyright, author from
byline (unchanged), author false positive, TOC extraction, TOC/body
reconciliation, split chapter title (marker + lookahead), duplicate
TOC/body prevention, running header, folio/page number, ordinary PDF
unchanged, DOCX/TXT/MD unchanged, scanned-PDF/OCR unchanged, parse-failure
unchanged, `manuscriptTypeOverride` unchanged.

Level A (synthetic fixture, committed): generated at test time, covers the
same structural conditions as the real book without embedding it.

Level B (real PDF, local-only): gated behind `REAL_PDF_FIXTURE` env var;
`REAL_PDF_ACCEPTANCE = NOT_RUN` when unavailable in an environment, never a
fabricated PASS.

E2E (Playwright): upload → analysis → confirm → project → editor, asserting
real title/author/structure and the absence of an app-originated HTTP 500.

## Rollback considerations

The change is additive/corrective inside a single module
(`import-pipeline.ts`) plus the PDF branch of `extractTextFromBuffer`. No
schema or persisted-data migration is involved. Reverting this commit
restores prior (buggy) behavior with no data loss, since `ImportedDocumentSeed`
is only ever used at import time, not persisted in this shape.
