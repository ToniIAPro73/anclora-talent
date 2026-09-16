# Tasks

- [x] Model and legacy adapter.
- [x] Font normalization and resolution.
- [x] PDF layout evidence extraction (text-layer PDFs).
- [x] Style clustering and deterministic role inference.
- [x] Profile quality/confidence.
- [x] Composition application while preserving manuscript structure.
- [x] Style-first modal and creation-flow copy (ES/EN).
- [x] Saved reusable profiles on the existing versioned store.
- [x] Unit, fixture, regression, and build coverage.
- [x] Final lint and build gates.
- [x] DOCX-specific OOXML style and section extraction.
- [ ] Full Composer heading/header/footer rule rendering beyond the shared HTML export CSS.
- [ ] Browser E2E and visual QA across all viewports/themes; local PDF extraction QA completed, but the PDF remains an external fixture.
- [ ] Full typecheck cleanup; baseline repository errors remain outside this feature.

## Evidence matrix

| Capability | Status | Evidence |
| --- | --- | --- |
| Body typography, size, line-height, margins | PASS | Composition application and preview adapter tests |
| H1/H2/H3 style extraction and HTML export CSS | PASS | PDF/DOCX extraction tests and export CSS mapping |
| Chapter opening observation | PASS | Spaced-label and repeated-large-heading detection; real PDF smoke analysis |
| Headers, footers, folios, TOC observation | PASS | Real PDF smoke analysis: all detected |
| Quote/list extraction | PASS | DOCX OOXML style extraction |
| Full renderer parity for every role and PDF React renderer | PARTIAL | PDF now maps H1/H2/H3, quote/list, dynamic header/footer/folio and TOC leaders; DOCX/EPUB and chapter-opening parity remain partial |
| Real PDF fixture | PASS | 122 pages, 7,617 fragments, ~1.1s, SHA256 recorded in handoff |
| DOCX fixture | PASS | OOXML package integration test |
| Browser E2E and visual QA | BLOCKED | Authenticated Playwright setup reached `/api/auth/register` with HTTP 500 in this environment; visual review requires a working app/session |

## Renderer matrix

| Role | HTML | PDF | DOCX | EPUB |
| --- | --- | --- | --- | --- |
| Body | PASS | PASS | PARTIAL | PARTIAL |
| H1/H2/H3 | PASS | PASS | PARTIAL | PARTIAL |
| Chapter opening | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Quote | PASS | PASS | PARTIAL | PARTIAL |
| UL/OL | PASS | PASS | PARTIAL | PARTIAL |
| Header/footer | PARTIAL | PASS for dynamic target title/folio | PARTIAL | PARTIAL |
| Page number | PASS | PASS | PARTIAL | PARTIAL |
| TOC and leaders | PASS | PASS | PARTIAL | PARTIAL |

PDF renderer smoke evidence: target project export completed with the real
reference profile in approximately 2.3 seconds; the binary contained the
target title and did not contain the reference title. Pixel-level visual QA
was not performed in this environment.
