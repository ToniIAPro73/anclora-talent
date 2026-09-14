# PDF import structural recovery — tasks v1

- [x] T1 Diagnose real PDF output (`pdf-parse` page-aware + whole-text) and
      the actual `buildImportedDocumentSeed` result against it. Documented
      in the spec's "Current failure — root causes".
- [x] T2 Write spec/plan/tasks.
- [x] T3 Page-aware extraction in `extractTextFromBuffer` (PDF branch):
      `stripRunningHeadersAndFolios` + explicit `pageJoiner: '\n\n'`, using
      `pdf-parse`'s per-page `TextResult.pages`.
- [x] T4 `normalizeTrackedHeading` + tests (ES/EN tracked headings, negative
      cases).
- [x] T5 `CHAPTER_MARKER_RE` + `consumeHeadingContinuationLines` +
      tests (split chapter title, marker-with-inline-title unaffected).
- [x] T6 `extractAuthorFromCopyright` (+ byline-prefix stripping) + tests
      (positive, false positives: company/imprint/URL).
- [x] T7 Multi-line title/subtitle merge (`splitTitleSubtitleBlock`) +
      editorial title-casing (`finalizeHeadingText` /
      `toEditorialTitleCase`) + tests.
- [x] T8 `MAJOR_HEADING_RE` gains `apéndice`; regression test.
- [x] T9 TOC-as-evidence, revised from the original plan: rather than a
      separate `detectTableOfContents` + `reconcileOutlineWithToc` pass
      run *after* structure detection, the fix is at the source —
      `insideToc` state tracking in `parseTextBlocks` (set on an
      `isTocChapterTitle` heading, cleared at the next page boundary) plus
      an `isPotentialHeadingLine` guard so a colon-titled real heading is
      never swallowed by the TOC-entry heuristic. This prevents TOC lines
      ("Prólogo 6", "Epílogo 110") from ever being misclassified as
      standalone headings in the first place, so there is nothing to
      reconcile after the fact. Covered by the "table of contents" describe
      block in `import-pipeline.pdf-structure.test.ts` and by the Level A
      fixture. Also fixed along the way: a bare-digit-prefix false-positive
      in `getHeadingLevel`/`cleanHeadingText` (numeric heading marker now
      requires explicit `.`/`)` punctuation), an internal-sentence-period
      guard in `isStrongStandaloneHeadingSignal`, and a word-count cap on
      the ambiguous `después de` / `recursos` / `cierre` / `sección`
      `MAJOR_HEADING_RE` alternatives (`matchesMajorHeadingKeyword`) — all
      needed once page-aware extraction stopped masking them inside one
      giant front-matter blob.
- [x] T10 Confidence model: `authorSource` (`byline` / `copyright` / `none`)
      replaces the old position-in-text proxy for author confidence, per
      spec §9. Regression tests green (existing + new).
- [x] T11 Synthetic fixture (`__fixtures__/pdf-regression-fixture.ts`,
      generated at test time via `pdf-lib`, not committed as a binary) +
      fixture-level regression test (title, subtitle, author, 5 primary
      structural units + index, content integrity, no dup TOC entries, no
      header/footer pollution, performance).
- [x] T12 Backward-compat suites green: DOCX, TXT, MD, OCR/scanned-PDF,
      parse-failure, `manuscriptTypeOverride` — full `vitest run`: 185
      files / 1183 tests, all green (includes one intentionally corrected
      expectation in `preflight.test.ts`: the `exito_sin_compania.docx`
      fixture's own copyright line is now correctly recovered as its
      author, closing a KDP/Kobo "missing author" gap that was itself a
      symptom of the same bug, not something specific to the docx format).
- [x] T13 Real PDF acceptance run (local, `REAL_PDF_FIXTURE`), captured in
      the final report.
- [x] T14 Reproduced and fixed the editor HTTP 500: root cause was
      `pdf-parse`'s `pdfjs-dist` dependency being bundled into a Turbopack
      server chunk in production, which broke its relative-path worker
      resolution (`Cannot find module '.next/server/chunks/pdf.worker.mjs'`)
      — PDF parsing silently failed in production and fell back to the
      empty-shell/filename-fallback path, independent of (and prior to) all
      the detection-logic fixes above. This is the more fundamental
      explanation for the original bug report's exact symptom (title
      falling back to the filename). Fixed by adding `pdf-parse` and
      `pdfjs-dist` to `serverExternalPackages` in `next.config.ts`, mirroring
      the existing `@sparticuz/chromium` pattern. Verified end-to-end
      against a real `next build && next start` server with the real PDF —
      see T15.
- [x] T15 Playwright E2E (`e2e/pdf-import-structural-recovery.spec.ts`):
      upload → analysis panel (title/subtitle/author/structure assertions)
      → confirm → project created → editor opens → chapter content
      accessible, with app-originated-HTTP-500 monitoring throughout. Gated
      behind `REAL_PDF_FIXTURE`; ran green 3/3 against a real production
      build with the real regression PDF.
- [x] T16 Gates: lint 0 errors (4 pre-existing warnings, none in touched
      files), typecheck baseline unchanged (89 errors before and after,
      none in touched files), `vitest run` 185/185 files green, `next build`
      green.
- [x] T17 Remove temporary diagnostic scripts (`tmp/*.ts`, `tmp/*.mjs`) and
      local test-server artifacts before commit.
- [x] T18 Commit, push, PR to `development`.
