# PDF import structural recovery — plan v1

## Approach

Fix the pipeline at its source (page-aware extraction) first, since that
single defect (page-joiner corruption) explains the majority of observed
symptoms; then layer the detection improvements from the spec on top, each
independently testable.

## Steps

1. **Page-aware extraction.** Change the PDF branch of
   `extractTextFromBuffer` to read `parsed.pages`, strip running
   headers/folios per page (frequency-based), and rejoin with `\n\n`.
2. **Tracked-heading normalization.** Add `normalizeTrackedHeading` and use
   it inside the heading classifiers (`isStrongStandaloneHeadingSignal` /
   `isLikelyStandaloneHeading` / `inferHeadingLevel`) via a thin wrapper, not
   by mutating stored line text.
3. **Chapter-marker lookahead.** Add `isChapterMarkerLine` +
   `consumeHeadingContinuationLines`; wire into `parseTextBlocks`'s per-line
   loop (switch to index-based iteration to allow lookahead/skip-ahead).
4. **Author-from-copyright.** Add `extractAuthorFromCopyright`, called as a
   fallback inside `detectAuthorFromFrontMatter` before the existing
   whole-text bold-markdown fallback.
5. **Title/subtitle multi-line merge.** Extend `detectTitleFromFrontMatter`
   / `detectSubtitleFromFrontMatter` with the capitalization-transition
   rule.
6. **`MAJOR_HEADING_RE`: add `apéndice`.**
7. **TOC extraction + reconciliation.** Add `detectTableOfContents` (from
   the already-isolated front-matter TOC block) and
   `reconcileOutlineWithToc`, applied after `buildChaptersFromBlocks`.
8. **Unit tests** for every item in the spec's test matrix, written before
   (or alongside, given several are small pure functions) each step.
9. **Synthetic fixture** (`fixtures/pdf-import/regression-book.pdf` or
   generated in-test) covering all structural conditions; a fixture-level
   regression test asserting the full expected seed shape.
10. **Real PDF acceptance script** (`REAL_PDF_FIXTURE` env var), run
    locally, not committed, output captured for the final report.
11. **Editor HTTP 500 reproduction.** Run the dev/build server, do the full
    import → confirm → open-editor flow with the corrected pipeline using
    the real PDF; capture server logs; fix if caused by malformed seed data,
    otherwise document as a separate follow-up.
12. **Gates.** lint, typecheck, `vitest run`, build, relevant Playwright.
13. **Cleanup.** Remove any temporary diagnostic scripts from `tmp/`.
14. **Commit, push, PR to `development`.**

## Risk / rollback

Single-module change, no persisted schema touched. See spec's Rollback
considerations.
