# P4 — Semantic Export, Mobile Authoring and Operational i18n

Repo status: NEEDS_HARDENING

Findings: UX-13, UX-14, UX-17.

## P4-M00 — Semantic DOCX

- **ID:** P4-M00
- **TITLE:** Produce editable Word content
- **OBJECTIVE:** make DOCX contain editable semantic text while preserving cover/pagination intent.
- **SOURCE_DRIVERS:** UX-13; current image-first `buildProjectDocxBuffer`; P1 corpus.
- **CURRENT_STATE:** DOCX ZIP is valid but has zero `w:t` nodes and page images.
- **TARGET_STATE:** headings, paragraphs, lists, inline emphasis/links and images are represented as appropriate editable DOCX structures.
- **SCOPE:** DOCX builder, route and artifact tests.
- **OUT_OF_SCOPE:** removing an explicitly labeled visual-fidelity option.
- **DEPENDENCIES:** P1 PASS.
- **PREREQUISITES:** canonical document and corpus.
- **RISKS:** page fidelity and document semantics conflict; images/inline styles lost.
- **DO_NOT_BREAK:** cover fidelity, chapter order, metadata, filenames and ownership.
- **AFFECTED_ROUTES:** `/api/projects/export/docx`, preview export links.
- **AFFECTED_COMPONENTS:** export builder/button.
- **AFFECTED_API:** DOCX response only; no silent content fallback.
- **AFFECTED_DATA:** read-only ProjectRecord.
- **AFFECTED_TESTS:** DOCX XML and route tests.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** retain prior capability only as explicit visual mode; block standard DOCX release if semantics fail.
- **OBSERVABILITY:** source/output block counts and artifact manifest.
- **DOCUMENTATION_UPDATES:** capability matrix and user-facing distinction.

### TASKS
#### P4-M00-T01 — Semantic mapping
- P4-M00-T01.01 Map headings/paragraphs/lists/inline marks to DOCX.
- P4-M00-T01.02 Map links/images and alt metadata where available.
- P4-M00-T01.03 Preserve chapter order and stable identity metadata.
#### P4-M00-T02 — Builder/route
- P4-M00-T02.01 Generate editable document sections/runs.
- P4-M00-T02.02 Keep cover/back-cover capability explicit and compatible.
- P4-M00-T02.03 Validate before returning download.
#### P4-M00-T03 — Artifact verification
- P4-M00-T03.01 Assert non-zero `w:t` content for populated fixtures.
- P4-M00-T03.02 Assert headings/order/images and ES/EN characters.
- P4-M00-T03.03 Assert empty fixture remains valid and explicit.

### ACCEPTANCE CRITERIA

GIVEN a populated multi-chapter fixture, WHEN DOCX is opened/inspected, THEN its manuscript text is editable and ordered with headings/lists preserved, AND an image-only standard DOCX fails G18.

## P4-M01 — Semantic standard PDF and explicit visual capability

- **ID:** P4-M01
- **TITLE:** Separate selectable PDF from raster fidelity
- **OBJECTIVE:** make standard PDF text selectable/readable or label a separate image-fidelity export.
- **SOURCE_DRIVERS:** UX-13; current PDF image path; SPEC §§11,31.
- **CURRENT_STATE:** audited PDF has 27 pages, no text extraction and no tags.
- **TARGET_STATE:** standard PDF contains selectable readable text; rasterized visual output is separately named/capability-gated.
- **SCOPE:** PDF builder/routes/UI states and artifact tests.
- **OUT_OF_SCOPE:** removing cover visual fidelity or changing publication defaults without proof.
- **DEPENDENCIES:** P1 PASS, P4-M00 contract.
- **PREREQUISITES:** PDF tooling and corpus.
- **RISKS:** font/layout differences, accessibility metadata overclaim.
- **DO_NOT_BREAK:** pagination intent, cover appearance, device/publication controls.
- **AFFECTED_ROUTES:** `/api/projects/export/pdf`, PDF button.
- **AFFECTED_COMPONENTS:** PDF builder/button.
- **AFFECTED_API:** additive capability parameter only if explicitly documented.
- **AFFECTED_DATA:** read-only document.
- **AFFECTED_TESTS:** PDF text-layer/page/artifact tests.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** keep visual capability explicit and block standard release if text missing.
- **OBSERVABILITY:** PDF capability, page count, extracted text count and duration.
- **DOCUMENTATION_UPDATES:** export capability/help text.

### TASKS
#### P4-M01-T01 — Define capabilities
- P4-M01-T01.01 Name standard semantic PDF and visual-fidelity PDF separately.
- P4-M01-T01.02 Define UI status and filename distinctions.
- P4-M01-T01.03 Preserve existing cover and publication options.
#### P4-M01-T02 — Implement standard output
- P4-M01-T02.01 Render document text through semantic PDF primitives.
- P4-M01-T02.02 Preserve headings, paragraphs, order and readable text.
- P4-M01-T02.03 Fail closed when a populated page lacks required content.
#### P4-M01-T03 — Verify artifact
- P4-M01-T03.01 Assert `pdftotext`/equivalent yields manuscript content.
- P4-M01-T03.02 Assert page count/order and cover metadata.
- P4-M01-T03.03 Assert visual capability remains explicit and tested separately.

### ACCEPTANCE CRITERIA

GIVEN the standard PDF capability, WHEN a populated fixture is opened in a text extractor, THEN headings and manuscript text are selectable/readable, AND any image-only output is labeled as a separate visual-fidelity capability rather than silently passed.

## P4-M02 — Physical mobile authoring

- **ID:** P4-M02
- **TITLE:** Fit the chapter editor to narrow physical viewports
- **OBJECTIVE:** remove clipping at 390/430px without changing persisted publication/export device mode.
- **SOURCE_DRIVERS:** UX-14; `AdvancedRichTextEditor`, `ChapterEditorFullscreen`, editor preferences.
- **CURRENT_STATE:** document width remains about 521px and desktop spread persists at mobile widths.
- **TARGET_STATE:** fitted single column, adaptive toolbar and early primary content at 390/430; desktop spread remains at desktop.
- **SCOPE:** physical editor layout, toolbar disclosure and responsive tests.
- **OUT_OF_SCOPE:** changing stored manuscript format or export device selector.
- **DEPENDENCIES:** P2 responsive/accessibility; P1 document contract.
- **PREREQUISITES:** geometry assertions and editor fixture.
- **RISKS:** keyboard shortcuts/formatting loss; toolbar actions hidden without discoverability.
- **DO_NOT_BREAK:** desktop spread, shortcuts, formatting, chapter navigation and source content.
- **AFFECTED_ROUTES:** chapter editor/fullscreen.
- **AFFECTED_COMPONENTS:** AdvancedRichTextEditor, ChapterEditorFullscreen, toolbar groups.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** no persistence shape change.
- **AFFECTED_TESTS:** editor component, responsive and E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert viewport adapter while preserving desktop behavior.
- **OBSERVABILITY:** content rectangle, horizontal overflow, toolbar focus trace.
- **DOCUMENTATION_UPDATES:** physical/editor versus publication device contract.

### TASKS
#### P4-M02-T01 — Separate viewport/layout
- P4-M02-T01.01 Detect physical viewport breakpoint independently of publication mode.
- P4-M02-T01.02 Fit document to single column at 390/430.
- P4-M02-T01.03 Preserve desktop spread and stored export settings.
#### P4-M02-T02 — Adapt controls
- P4-M02-T02.01 Group secondary toolbar controls progressively.
- P4-M02-T02.02 Preserve keyboard shortcuts and accessible names.
- P4-M02-T02.03 Keep chapter/page navigation visible and usable.
#### P4-M02-T03 — Validate responsive authoring
- P4-M02-T03.01 Assert no horizontal clipping at 390/430.
- P4-M02-T03.02 Assert content starts before the current excessive chrome boundary.
- P4-M02-T03.03 Run desktop/tablet/mobile editor E2E in light/dark.

### ACCEPTANCE CRITERIA

GIVEN a chapter editor at 390×844 or 430×932, WHEN the chapter contains real text, THEN the full text column is readable without horizontal clipping and primary content appears early, AND desktop spread and publication/export settings remain unchanged.

## P4-M03 — Operational i18n

- **ID:** P4-M03
- **TITLE:** Localize importer, templates, cover/back-cover, preview and export status
- **OBJECTIVE:** close mixed operational copy without translating user-authored manuscript content.
- **SOURCE_DRIVERS:** UX-17; LOCALIZATION_CONTRACT; `messages.ts` compatibility gap.
- **CURRENT_STATE:** shell/auth are partly localized; importer/template/PDF status strings remain Spanish/mixed.
- **TARGET_STATE:** all affected operational strings resolve from ES/EN locale contract and survive transient states.
- **SCOPE:** messages, DocumentImporter, cover templates/back cover, preview/export statuses/errors.
- **OUT_OF_SCOPE:** translating manuscript content or adding locales.
- **DEPENDENCIES:** P2 semantic controls; P1 export states.
- **PREREQUISITES:** locale key inventory and parity tests.
- **RISKS:** long copy causes clipping or changes action semantics.
- **DO_NOT_BREAK:** manuscript language, working locale switch, theme and existing copy intent.
- **AFFECTED_ROUTES:** new project, editor, cover/back-cover, preview, PDF export, auth.
- **AFFECTED_COMPONENTS:** DocumentImporter, cover templates, PdfExportButton, preview/export/auth copy.
- **AFFECTED_API:** none unless server errors need localized keys.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** message parity, component and E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert keys/copy without reverting content or locale preference.
- **OBSERVABILITY:** rendered locale/key inventory and screenshots.
- **DOCUMENTATION_UPDATES:** locale coverage matrix.

### TASKS
#### P4-M03-T01 — Inventory/extract copy
- P4-M03-T01.01 Find hard-coded operational strings in affected surfaces.
- P4-M03-T01.02 Add stable ES/EN keys with placeholders preserved.
- P4-M03-T01.03 Mark user-authored text as intentionally untranslated.
#### P4-M03-T02 — Render parity
- P4-M03-T02.01 Localize importer/templates/back cover/preview controls.
- P4-M03-T02.02 Localize PDF pending/error/success and auth errors.
- P4-M03-T02.03 Preserve layout under expanded EN/ES copy.
#### P4-M03-T03 — Test end-to-end
- P4-M03-T03.01 Extend messages parity tests beyond dictionary shape.
- P4-M03-T03.02 Render affected ES/EN journeys in light/dark.
- P4-M03-T03.03 Assert no mixed operational language remains.

### ACCEPTANCE CRITERIA

GIVEN New project, Cover/Back cover, Preview and PDF export in EN, WHEN pending/error/control states render, THEN operational copy remains English throughout, AND manuscript text remains exactly authored; the equivalent ES journey is also complete.

## P4-FINAL-GATE

- P4-M00..M03 PASS.
- G17/G18 prove semantic DOCX and standard PDF content; visual PDF is explicit.
- G9 proves editor behavior at 390/430/768/1440; G7 proves toolbar/navigation semantics.
- G16 proves operational ES/EN parity across affected surfaces.
- Existing cover canvas, pagination, composition defaults and EPUB remain green.

### Additional final tasks

#### P4-FINAL-T01 — Artifact/capability review
- P4-FINAL-T01.01 Review standard versus visual export labels.
- P4-FINAL-T01.02 Review content/order/character/image evidence.
- P4-FINAL-T01.03 Record G17/G18 result.

#### P4-FINAL-T02 — Phase closure
- P4-FINAL-T02.01 Run lint, full tests, build and affected E2E.
- P4-FINAL-T02.02 Update documentation and inspect diff.
- P4-FINAL-T02.03 Permit commit/promotion only on PASS.
