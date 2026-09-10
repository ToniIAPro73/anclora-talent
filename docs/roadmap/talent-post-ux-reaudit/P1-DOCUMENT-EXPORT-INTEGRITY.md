# P1 — Document and Export Integrity / UX-12

Repo status: NEEDS_HARDENING

Objective: prove why a populated project can yield empty HTML/DOCX, make export fail closed, and establish artifact acceptance before any polish work.

### EXECUTION MODE

- `CAVEMAN`: P1-M01-T01, P1-M04-T01, P1-M04-T03.
- Normal prose: all other tasks and P1-FINAL-GATE; integrity decisions never compressed.

## P1-M00 — Canonical document/export contract

- **ID:** P1-M00
- **TITLE:** Define one validated semantic source for preview and export
- **OBJECTIVE:** make persisted chapters/blocks the source of truth and define projection validation.
- **SOURCE_DRIVERS:** UX-12; SPEC §§10–11,31; `preview-adapter.ts`, `from-html.ts`, export builders.
- **CURRENT_STATE:** client/server composition paths can diverge; placeholder fallback exists.
- **TARGET_STATE:** every export receives a validated semantic document with source/output counts and ordered chapter identity.
- **SCOPE:** types/contracts, empty-versus-failure states, validation result and compatibility rules.
- **OUT_OF_SCOPE:** visual redesign, schema migration, semantic DOCX/PDF implementation (P4).
- **DEPENDENCIES:** P0 PASS.
- **PREREQUISITES:** P0 corpus and architecture map.
- **RISKS:** changing the source projection breaks full preview or EPUB.
- **DO_NOT_BREAK:** persisted content, order, full preview, composition defaults, EPUB route.
- **AFFECTED_ROUTES:** preview and HTML/DOCX/PDF/EPUB export routes.
- **AFFECTED_COMPONENTS:** compose/preview/export adapters.
- **AFFECTED_API:** existing export responses and ownership checks.
- **AFFECTED_DATA:** ProjectRecord only; no destructive rewrite.
- **AFFECTED_TESTS:** compose/preview/export suites.
- **MIGRATION_IMPACT:** none unless proven by Gate.
- **ROLLBACK_STRATEGY:** revert contract adapter while retaining fixture tests.
- **OBSERVABILITY:** source/output counts, document digest and validation class.
- **DOCUMENTATION_UPDATES:** export contract and error-state docs.

### TASKS

#### P1-M00-T01 — Specify source projection
- P1-M00-T01.01 Define chapter/block-to-semantic-document mapping.
- P1-M00-T01.02 Define empty project versus populated conversion failure.
- P1-M00-T01.03 Define stable ordering and source digest fields.

#### P1-M00-T02 — Specify artifact validation
- P1-M00-T02.01 Define HTML completeness and order assertions.
- P1-M00-T02.02 Define DOCX/PDF semantic and image assertions.
- P1-M00-T02.03 Define metadata and character preservation assertions.

#### P1-M00-T03 — Define compatibility envelope
- P1-M00-T03.01 Identify preview/EPUB consumers of the adapter.
- P1-M00-T03.02 Define backward-compatible route response/error classes.
- P1-M00-T03.03 Add focused contract tests before implementation.

### ACCEPTANCE CRITERIA

GIVEN a populated ProjectRecord, WHEN the export contract is evaluated, THEN source chapter/block counts and output completeness are explicit, AND an empty output is distinguishable from a genuinely empty project.

## P1-M01 — Root-cause reproduction and runtime proof

- **ID:** P1-M01
- **TITLE:** Reproduce the export mismatch with a real synthetic fixture
- **OBJECTIVE:** replace the audit's plausible server-runtime explanation with executable evidence.
- **SOURCE_DRIVERS:** downloaded production artifacts; `from-html.ts` fallback; re-audit limitation.
- **CURRENT_STATE:** fallback to `[]` is visible in code; deployed runtime diagnosis is not proven.
- **TARGET_STATE:** local/preview/staging reproduction identifies the failing boundary or proves it absent.
- **SCOPE:** server runtime, DOM parser availability, client/server composition comparison.
- **OUT_OF_SCOPE:** production mutation and ad hoc production data.
- **DEPENDENCIES:** P1-M00.
- **PREREQUISITES:** populated synthetic fixture and export inspector.
- **RISKS:** environment-specific success hides deployment failure.
- **DO_NOT_BREAK:** ownership checks and safe fixture isolation.
- **AFFECTED_ROUTES:** HTML/DOCX export routes.
- **AFFECTED_COMPONENTS:** `from-html`, preview adapter, export builder.
- **AFFECTED_API:** export GET handlers.
- **AFFECTED_DATA:** synthetic populated chapters only.
- **AFFECTED_TESTS:** server runtime/integration export tests.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** remove reproduction harness; preserve failing regression test.
- **OBSERVABILITY:** request ID, runtime, source/output counts and error class, no manuscript logging.
- **DOCUMENTATION_UPDATES:** root-cause report linked to UX-12.

### TASKS

#### P1-M01-T01 — Reproduce server composition
- P1-M01-T01.01 Run canonical fixture through client semantic projection.
- P1-M01-T01.02 Run the same fixture through server export runtime.
- P1-M01-T01.03 Compare chapter/block counts and content digests.

#### P1-M01-T02 — Prove runtime dependency boundary
- P1-M01-T02.01 Exercise DOM runtime initialization in production build mode.
- P1-M01-T02.02 Record parser/worker/module resolution failures without secrets.
- P1-M01-T02.03 Verify whether `null`/`[]` is reachable for populated content.

#### P1-M01-T03 — Lock regression
- P1-M01-T03.01 Add a test that fails when populated content becomes empty.
- P1-M01-T03.02 Add a test for genuinely empty project behavior.
- P1-M01-T03.03 Add a test preserving chapter order and special characters.

### ACCEPTANCE CRITERIA

GIVEN a populated multi-chapter fixture, WHEN server export composition runs in the same runtime class as deployment, THEN the root cause is evidenced or the mismatch is disproven, AND no populated source may reach a placeholder-success path.

## P1-M02 — Export acceptance corpus

- **ID:** P1-M02
- **TITLE:** Build non-destructive HTML/DOCX/PDF corpus
- **OBJECTIVE:** exercise content classes that the current audit did not fully certify.
- **SOURCE_DRIVERS:** SPEC §31; audit UX-12/13; existing fixtures/tests.
- **CURRENT_STATE:** valid bytes and image pages can pass without manuscript assertions.
- **TARGET_STATE:** corpus checks title, headings, paragraphs, lists, emphasis, links, images, ES/EN characters, order, cover and back cover.
- **SCOPE:** fixtures and inspectors only.
- **OUT_OF_SCOPE:** changing export implementation.
- **DEPENDENCIES:** P0-M03, P1-M00.
- **PREREQUISITES:** safe synthetic project factory.
- **RISKS:** binary parser differences or flaky image/network inputs.
- **DO_NOT_BREAK:** existing fixture files and test execution time budgets.
- **AFFECTED_ROUTES:** HTML/DOCX/PDF/EPUB test routes/builders.
- **AFFECTED_COMPONENTS:** export inspectors.
- **AFFECTED_API:** test-only requests.
- **AFFECTED_DATA:** synthetic fixtures.
- **AFFECTED_TESTS:** new artifact tests.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** remove new corpus without deleting existing fixtures.
- **OBSERVABILITY:** artifact manifest and deterministic fixture ID.
- **DOCUMENTATION_UPDATES:** corpus catalog and expected outputs.

### TASKS

#### P1-M02-T01 — Content fixtures
- P1-M02-T01.01 Add empty and one-chapter fixtures.
- P1-M02-T01.02 Add multi-chapter headings/lists/emphasis/link fixture.
- P1-M02-T01.03 Add image, cover/back-cover and ES/EN character fixture.

#### P1-M02-T02 — HTML/DOCX inspection
- P1-M02-T02.01 Inspect HTML DOM headings, paragraphs and chapter order.
- P1-M02-T02.02 Inspect DOCX XML text runs, headings and images.
- P1-M02-T02.03 Assert complete content and reject placeholder-only output.

#### P1-M02-T03 — PDF/manifest inspection
- P1-M02-T03.01 Record PDF page count and text extraction output.
- P1-M02-T03.02 Record image presence and metadata relevant to the selected capability.
- P1-M02-T03.03 Write machine-readable artifact manifest and failure reason.

### ACCEPTANCE CRITERIA

GIVEN each corpus fixture, WHEN HTML, DOCX and PDF outputs are inspected, THEN expected content classes and chapter order are asserted, AND a file with valid bytes but missing manuscript content fails.

## P1-M03 — Fail-closed export and observability

- **ID:** P1-M03
- **TITLE:** Prevent apparent success for invalid artifacts
- **OBJECTIVE:** make export return a diagnostic failure when populated content is lost.
- **SOURCE_DRIVERS:** UX-12; SPEC §§11,36; transport/integrity distinction.
- **CURRENT_STATE:** placeholder can be rendered/downloaded after content loss.
- **TARGET_STATE:** export validates before response and exposes localized actionable recovery without sensitive logs.
- **SCOPE:** export gate, error classes, user-facing state and safe logging.
- **OUT_OF_SCOPE:** account recovery and semantic PDF implementation.
- **DEPENDENCIES:** P1-M01, P1-M02.
- **PREREQUISITES:** validated source/output counts and artifact inspectors.
- **RISKS:** false positives on genuinely empty projects; leaking content in logs.
- **DO_NOT_BREAK:** empty-project export semantics, filenames, ownership, retry behavior.
- **AFFECTED_ROUTES:** HTML/DOCX/PDF export routes.
- **AFFECTED_COMPONENTS:** export buttons and route error states.
- **AFFECTED_API:** existing status/content type contract, with additive error details only.
- **AFFECTED_DATA:** no persistence changes.
- **AFFECTED_TESTS:** negative export and error recovery tests.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert gate and return to prior route only if it cannot regress content; retain failing test.
- **OBSERVABILITY:** correlation ID, format, counts, validation class, duration.
- **DOCUMENTATION_UPDATES:** export recovery and logging contract.

### TASKS

#### P1-M03-T01 — Implement validation gate
- P1-M03-T01.01 Validate populated source against projected blocks before render.
- P1-M03-T01.02 Validate rendered artifact before download response.
- P1-M03-T01.03 Return explicit failure for populated-to-empty conversion.

#### P1-M03-T02 — Implement recovery state
- P1-M03-T02.01 Add localized pending/failure/success states for each export format.
- P1-M03-T02.02 Preserve source and provide retry guidance without fake success.
- P1-M03-T02.03 Keep download filename and ownership behavior stable.

#### P1-M03-T03 — Add diagnostics
- P1-M03-T03.01 Define non-sensitive error classes and correlation/request ID usage.
- P1-M03-T03.02 Add structured logs for requested/failed/validated/completed states.
- P1-M03-T03.03 Add negative tests for no manuscript logging and no apparent success.

### ACCEPTANCE CRITERIA

GIVEN a populated source whose export projection loses chapters, WHEN the user requests HTML/DOCX/PDF, THEN the response is a diagnostic failure with retry guidance, AND no download is presented as a valid deliverable.

## P1-M04 — Artifact validation and phase evidence

- **ID:** P1-M04
- **TITLE:** Close UX-12 with structural artifact evidence
- **OBJECTIVE:** demonstrate complete HTML and DOCX content before moving to semantic export work.
- **SOURCE_DRIVERS:** UX-12 critical priority; G17/G18.
- **CURRENT_STATE:** current artifacts fail content integrity despite transport success.
- **TARGET_STATE:** populated HTML/DOCX pass titles, headings, paragraphs, content, order, characters, images and metadata; invalid artifacts fail.
- **SCOPE:** end-to-end fixture execution and evidence.
- **OUT_OF_SCOPE:** production promotion in this microphase.
- **DEPENDENCIES:** P1-M00..M03.
- **PREREQUISITES:** all artifact validators available.
- **RISKS:** local runtime differs from staging/production.
- **DO_NOT_BREAK:** PDF visual path, full preview, cover and EPUB.
- **AFFECTED_ROUTES:** HTML/DOCX export, preview.
- **AFFECTED_COMPONENTS:** export links/buttons only as needed for states.
- **AFFECTED_API:** export routes.
- **AFFECTED_DATA:** synthetic fixture.
- **AFFECTED_TESTS:** all P1 tests and regression.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** no close commit if any populated artifact fails.
- **OBSERVABILITY:** artifact hashes, manifest and test trace.
- **DOCUMENTATION_UPDATES:** UX-12 closure evidence and roadmap state.

### TASKS

#### P1-M04-T01 — Execute corpus
- P1-M04-T01.01 Generate HTML artifacts for every required fixture.
- P1-M04-T01.02 Generate DOCX artifacts for every required fixture.
- P1-M04-T01.03 Generate PDF comparison artifacts where applicable.

#### P1-M04-T02 — Review integrity
- P1-M04-T02.01 Verify title/headings/paragraphs/lists/order/characters.
- P1-M04-T02.02 Verify images, cover/back cover and metadata where applicable.
- P1-M04-T02.03 Verify failure artifacts are not exposed as successful downloads.

#### P1-M04-T03 — Record Gate evidence
- P1-M04-T03.01 Record command outputs, manifest and artifact hashes.
- P1-M04-T03.02 Run relevant lint/test/build/E2E checks.
- P1-M04-T03.03 Update UX-12 status only after all mandatory assertions pass.

### ACCEPTANCE CRITERIA

GIVEN the populated acceptance corpus, WHEN HTML and DOCX exports are inspected structurally, THEN all populated chapters and required content are present in order, AND any placeholder/empty artifact produces FAIL.

## P1-FINAL-GATE

- P1-M00..M04 are PASS.
- G17 and G18 are PASS for HTML/DOCX content integrity; G12 proves populated-to-empty fails closed.
- Full preview, cover, ownership, filenames and existing export routes remain green.
- Lint, focused tests, full tests, build and relevant E2E pass.
- Evidence records runtime/root cause, artifact manifests, hashes and recovery states.
- No promotion occurs if any mandatory check is FAIL/BLOCKED.
