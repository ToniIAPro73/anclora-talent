# P5 — Project Retrieval, Preview Continuity and Modal Surface

Repo status: DONE

Execution status: P5-M00 PASS; P5-M01 PASS; P5-M02 PASS; P5-M03 PASS; P5-FINAL-GATE PASS.

Gate evidence: the shared retrieval contract now drives `/projects` and the dashboard quick switcher with normalized query, deterministic recency/title ordering, status filtering, pagination and duplicate-title context. The full inventory and modal E2E use the same project identities and order. Preview entry renders the cover and first composed content page before the full preview action; the existing paginated preview remains available. Focus, ownership and destructive-action boundaries remain covered by the existing modal contract and regression tests.

Findings: UX-01, UX-04, UX-11.

### EXECUTION MODE

- `CAVEMAN`: P5-M00-T03, P5-M01-T03, P5-M02-T03, P5-M03-T03.
- Normal prose: retrieval/preview contract decisions and P5-FINAL-GATE.

## P5-M00 — Canonical retrieval model

- **ID:** P5-M00
- **TITLE:** Share search, recency, filters and identity semantics
- **OBJECTIVE:** make `/projects` and quick switcher different views of one retrieval model.
- **SOURCE_DRIVERS:** UX-04; SPEC §13; 57-project evidence.
- **CURRENT_STATE:** modal and page render separately; pagination/date ordering exists but no query/filter/user sort.
- **TARGET_STATE:** shared ownership-scoped retrieval model with normalized query, explicit recency sort, useful status filters and duplicate-title identity.
- **SCOPE:** retrieval types/query contract/repository or server data loader.
- **OUT_OF_SCOPE:** removing modal or changing project ownership.
- **DEPENDENCIES:** P1/P2/P4 PASS.
- **PREREQUISITES:** existing project summaries and ownership tests.
- **RISKS:** query leaks cross-user projects or changes default ordering.
- **DO_NOT_BREAK:** pagination, updatedAt ordering, row names, identity and update ordering.
- **AFFECTED_ROUTES:** `/projects`, dashboard project modal.
- **AFFECTED_COMPONENTS:** projects page/modal and retrieval hooks/loaders.
- **AFFECTED_API:** additive query/filter parameters only if needed.
- **AFFECTED_DATA:** read-only project summaries; no migration unless proven.
- **AFFECTED_TESTS:** repository/action/inventory tests.
- **MIGRATION_IMPACT:** likely none; any index migration requires separate Gate.
- **ROLLBACK_STRATEGY:** revert retrieval adapter to existing loader while preserving isolation tests.
- **OBSERVABILITY:** query/filter/page metrics without manuscript content.
- **DOCUMENTATION_UPDATES:** retrieval contract and duplicate-title rules.

### TASKS
#### P5-M00-T01 — Define retrieval contract
- P5-M00-T01.01 Define normalized query and duplicate-title disambiguation.
- P5-M00-T01.02 Define explicit recency/default ordering and useful status filters.
- P5-M00-T01.03 Define stable project identity and page state preservation.
#### P5-M00-T02 — Implement shared loader
- P5-M00-T02.01 Reuse ownership-scoped project source for page/modal.
- P5-M00-T02.02 Apply query/filter/sort/pagination deterministically.
- P5-M00-T02.03 Preserve default 57-project behavior and update-date ordering.
#### P5-M00-T03 — Test isolation
- P5-M00-T03.01 Test duplicate titles and recency ordering.
- P5-M00-T03.02 Test cross-user project exclusion.
- P5-M00-T03.03 Test empty/no-match states and page boundaries.

### ACCEPTANCE CRITERIA

GIVEN the audited 57-project dataset with duplicate titles, WHEN the same query and recency sort are used in `/projects` and the quick switcher, THEN both surfaces identify the same project records in the same order, AND no other user's project is returned.

## P5-M01 — Full inventory

- **ID:** P5-M01
- **TITLE:** Make the projects page efficient at scale
- **OBJECTIVE:** let a returning author find a project without scanning all cards.
- **SOURCE_DRIVERS:** UX-04; current `/projects` cards and audit B-068.
- **CURRENT_STATE:** 57 cards are vertically scanned; no search/filter/user sort.
- **TARGET_STATE:** searchable inventory with result count, duplicate disambiguation, recency sort and useful status filter.
- **SCOPE:** `/projects` page UI and shared retrieval state.
- **OUT_OF_SCOPE:** deleting existing pagination or quick switcher.
- **DEPENDENCIES:** P5-M00.
- **PREREQUISITES:** i18n keys and accessible input controls.
- **RISKS:** mobile density/long titles; query reset loses context.
- **DO_NOT_BREAK:** project identity, dates, open/preview/delete actions and ownership.
- **AFFECTED_ROUTES:** `/projects`.
- **AFFECTED_COMPONENTS:** project cards/inventory controls.
- **AFFECTED_API:** shared loader only.
- **AFFECTED_DATA:** read-only.
- **AFFECTED_TESTS:** component/responsive/E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** hide new controls and restore existing list if regressions occur.
- **OBSERVABILITY:** query/filter state and result counts.
- **DOCUMENTATION_UPDATES:** full inventory journey.

### TASKS
#### P5-M01-T01 — Search/filter UI
- P5-M01-T01.01 Add labeled query input with clear action.
- P5-M01-T01.02 Add explicit recency sort and useful status filter.
- P5-M01-T01.03 Add result/no-result count and duplicate-title context.
#### P5-M01-T02 — Preserve actions
- P5-M01-T02.01 Preserve open-editor and preview destinations as native links.
- P5-M01-T02.02 Preserve visible dates/status/author metadata.
- P5-M01-T02.03 Preserve safe delete confirmation and stable IDs.
#### P5-M01-T03 — Validate scale
- P5-M01-T03.01 Test 57 synthetic summaries and duplicate titles.
- P5-M01-T03.02 Test ES/EN, light/dark and 390/768/1440.
- P5-M01-T03.03 Test keyboard search/filter/action flow.

### ACCEPTANCE CRITERIA

GIVEN 57 projects, WHEN the author enters a title fragment and selects recency/status, THEN the intended project is found without scanning all entries, AND the result retains accessible actions and stable project identity.

## P5-M02 — Quick switcher

- **ID:** P5-M02
- **TITLE:** Differentiate and synchronize the quick switcher
- **OBJECTIVE:** retain the modal only as a fast resume surface with shared semantics.
- **SOURCE_DRIVERS:** UX-04; MODAL_CONTRACT; current modal pagination.
- **CURRENT_STATE:** modal is useful but unsearchable and semantically/visually independent.
- **TARGET_STATE:** quick switcher has deliberate purpose, query/recency/filter parity, preserved context and modal contract from P2.
- **SCOPE:** dashboard modal state and route return behavior.
- **OUT_OF_SCOPE:** removing modal or replacing full inventory.
- **DEPENDENCIES:** P2-M03, P5-M00.
- **PREREQUISITES:** dialog lifecycle PASS.
- **RISKS:** query state and route replacement lose opener/project context.
- **DO_NOT_BREAK:** pagination, row actions, close/restore focus and no destructive autofocus.
- **AFFECTED_ROUTES:** `/dashboard?projects=1`, project destinations.
- **AFFECTED_COMPONENTS:** ProjectsTableModal, dashboard opener.
- **AFFECTED_API:** shared retrieval loader.
- **AFFECTED_DATA:** read-only.
- **AFFECTED_TESTS:** modal retrieval/keyboard/E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert optional quick-switch controls while keeping shared loader contract.
- **OBSERVABILITY:** modal query/page/filter and close/restore events.
- **DOCUMENTATION_UPDATES:** quick-switcher purpose and route state.

### TASKS
#### P5-M02-T01 — Modal retrieval controls
- P5-M02-T01.01 Add compact labeled search/recency controls appropriate to modal.
- P5-M02-T01.02 Preserve three-page pagination or adapt it to filtered results.
- P5-M02-T01.03 Show title/date/status context for duplicate disambiguation.
#### P5-M02-T02 — Context preservation
- P5-M02-T02.01 Preserve query/filter/page when closing or returning where applicable.
- P5-M02-T02.02 Preserve opener focus and selected project identity.
- P5-M02-T02.03 Keep row actions and authorization boundaries unchanged.
#### P5-M02-T03 — Validate modal journey
- P5-M02-T03.01 Test keyboard and screen-reader names for controls.
- P5-M02-T03.02 Test mobile modal width/scroll rules.
- P5-M02-T03.03 Test same dataset/order as full inventory.

### ACCEPTANCE CRITERIA

GIVEN the quick switcher is opened, WHEN the author searches or changes recency/filter, THEN the modal returns the same project identities as the full inventory, AND close/return preserves focus and does not alter project data.

## P5-M03 — Immediate preview and modal surface

- **ID:** P5-M03
- **TITLE:** Show the document immediately and restore modal visual separation
- **OBJECTIVE:** remove the extra preview discovery action and prevent background text competition.
- **SOURCE_DRIVERS:** UX-01, UX-11; PreviewCanvas and modal surface CSS.
- **CURRENT_STATE:** PreviewCanvas is launcher-only; project modal is too transparent in dark mode.
- **TARGET_STATE:** first cover/content page is visible on preview entry; full preview remains; project modal surface is opaque/theme-consistent.
- **SCOPE:** PreviewCanvas and project modal visual shell.
- **OUT_OF_SCOPE:** changing full preview pagination/device controls; project retrieval semantics are P5-M00..M02.
- **DEPENDENCIES:** P1 canonical preview/export contract; P2 modal lifecycle.
- **PREREQUISITES:** composed fixture and visual evidence harness.
- **RISKS:** extra composition cost, modal contrast/regression, accidental loss of full preview entry.
- **DO_NOT_BREAK:** full preview, page navigation, device controls, pagination, cover canvas.
- **AFFECTED_ROUTES:** project preview and dashboard project modal.
- **AFFECTED_COMPONENTS:** PreviewCanvas, PreviewModal, ProjectsTableModal/CSS.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** read-only document.
- **AFFECTED_TESTS:** preview/modal visual/E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** restore launcher/full preview while retaining integrity tests; no close if immediate render loses content.
- **OBSERVABILITY:** time to first useful render, page/content presence, theme screenshots.
- **DOCUMENTATION_UPDATES:** preview journey and modal surface evidence.

### TASKS
#### P5-M03-T01 — Inline preview
- P5-M03-T01.01 Render first composed cover/content page on entry.
- P5-M03-T01.02 Preserve localized full-screen action.
- P5-M03-T01.03 Handle empty project honestly without placeholder confusion.
#### P5-M03-T02 — Modal surface
- P5-M03-T02.01 Use opaque theme-aware panel/backdrop tokens.
- P5-M03-T02.02 Preserve close/pagination/table density and focus behavior.
- P5-M03-T02.03 Validate dark/light contrast and no background text competition.
#### P5-M03-T03 — Journey evidence
- P5-M03-T03.01 Assert useful content is present after one route load.
- P5-M03-T03.02 Assert full preview modal still paginates and controls work.
- P5-M03-T03.03 Capture 390/768/1440 screenshots in ES/EN and themes.

### ACCEPTANCE CRITERIA

GIVEN a populated project preview route, WHEN the route loads, THEN real cover and first content are visible without a second discovery action, AND full preview remains available; GIVEN the project modal, WHEN dark/light renders, THEN table text is not competing with the background.

## P5-FINAL-GATE

- P5-M00..M03 PASS.
- UX-04 acceptance proves shared retrieval semantics and scale.
- UX-01 acceptance proves immediate useful preview without breaking full preview.
- UX-11 visual/modal evidence passes in both themes and mobile/desktop.
- Ownership, stable IDs, pagination, project actions and preview page order regressions are green.
