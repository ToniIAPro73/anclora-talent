# P6 — Editorial Workspace and Progressive Disclosure

Repo status: DONE

Execution status: P6-M00 PASS; P6-M01 PASS; P6-M02 PASS; P6-FINAL-GATE PASS.

Gate evidence: Content stage now presents a localized writing-first action panel and keeps metadata, composition rules, brand, health, co-author and history controls behind one native disclosure. The controls remain mounted and state-preserving, so power users can open the disclosure directly. The 1440px E2E measured the primary writing surface before the 400px boundary and reached chapters without interpreting optional rules; the same journey opened the rules panel and passed 390px document containment. Existing editor, preview, cover, export, theme and locale suites remained green.

Findings: UX-15, UX-16.

### EXECUTION MODE

- `CAVEMAN`: P6-M00-T03, P6-M01-T03, P6-M02-T03.
- Normal prose: hierarchy/disclosure decisions and P6-FINAL-GATE.

## P6-M00 — Progressive disclosure contract

- **ID:** P6-M00
- **TITLE:** Make writing/import the primary next action
- **OBJECTIVE:** reduce first-step decision load without removing composition expertise.
- **SOURCE_DRIVERS:** UX-15; ProjectWorkspace, DocumentRulesPanel, product promise.
- **CURRENT_STATE:** title, metadata, 15 composition controls, brand, health and history appear before chapter work.
- **TARGET_STATE:** title plus Write/import/continue is primary; advanced metadata/rules disclose contextually; defaults remain active.
- **SCOPE:** content-stage hierarchy/disclosure and state model.
- **OUT_OF_SCOPE:** deleting rules, brand profiles, publishing, history or metadata.
- **DEPENDENCIES:** P2, P4 and P5 PASS.
- **PREREQUISITES:** stable document/export/editor contracts.
- **RISKS:** hiding expert controls, losing unsaved state or changing default application.
- **DO_NOT_BREAK:** template defaults, full rule capability, brand independence, project identity.
- **AFFECTED_ROUTES:** project editor content stage.
- **AFFECTED_COMPONENTS:** ProjectWorkspace, DocumentRulesPanel, metadata/health/history panels.
- **AFFECTED_API:** existing save/update actions only.
- **AFFECTED_DATA:** no shape change; preserve defaults and values.
- **AFFECTED_TESTS:** workspace/component/E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** restore visibility order without deleting state.
- **OBSERVABILITY:** first primary action, disclosure state and persisted values.
- **DOCUMENTATION_UPDATES:** workspace hierarchy contract.

### TASKS
#### P6-M00-T01 — Define hierarchy
- P6-M00-T01.01 Identify primary writing/import/continue actions.
- P6-M00-T01.02 Classify metadata/rules/brand/history as contextual or advanced.
- P6-M00-T01.03 Define default-open versus disclosure states by persona.
#### P6-M00-T02 — Implement disclosure
- P6-M00-T02.01 Group optional controls without changing their values.
- P6-M00-T02.02 Keep expert controls keyboard accessible and localized.
- P6-M00-T02.03 Preserve save/update ordering and project identity.
#### P6-M00-T03 — Validate task continuity
- P6-M00-T03.01 Test first-time author reaches chapters without interpreting optional rules.
- P6-M00-T03.02 Test power user reaches rules/metadata without extra destructive flow.
- P6-M00-T03.03 Test light/dark and ES/EN disclosure states.

### ACCEPTANCE CRITERIA

GIVEN a new or returning author opens the Content stage, WHEN the user seeks to write/import, THEN the primary next action is visible without interpreting optional composition controls, AND a power user can still reach every rule, metadata, brand and history capability.

## P6-M01 — Workspace hierarchy

- **ID:** P6-M01
- **TITLE:** Compact stage chrome and bring the editorial surface forward
- **OBJECTIVE:** reclaim measurable workspace without hiding identity, progress or frequent actions.
- **SOURCE_DRIVERS:** UX-16; measured editor/cover geometry; premium contract.
- **CURRENT_STATE:** editor begins around y≈440 and cover surface is pushed down by stacked stage chrome.
- **TARGET_STATE:** compact stage heading/progress/explanation; primary editor/cover begins materially higher at 1440×900 and remains readable mobile.
- **SCOPE:** stage header, progress, explanatory copy and layout tokens.
- **OUT_OF_SCOPE:** removing stages, controls, cover canvas or page model.
- **DEPENDENCIES:** P6-M00; P4 mobile authoring.
- **PREREQUISITES:** before/after geometry harness.
- **RISKS:** loss of stage orientation or frequent action discoverability.
- **DO_NOT_BREAK:** project identity, stage navigation, live cover canvas, preview/export actions.
- **AFFECTED_ROUTES:** editor, cover, back-cover and preview shells.
- **AFFECTED_COMPONENTS:** stage headers/progress and workspace wrappers.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** visual/geometry/E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** restore header spacing/order while retaining component contracts.
- **OBSERVABILITY:** workspace start Y, visible primary surface and control counts.
- **DOCUMENTATION_UPDATES:** workspace measurements and evidence.

### TASKS
#### P6-M01-T01 — Compact stage chrome
- P6-M01-T01.01 Define compact header/progress tokens and breakpoints.
- P6-M01-T01.02 Move infrequent explanations into disclosure.
- P6-M01-T01.03 Keep stage identity and current-project context visible.
#### P6-M01-T02 — Preserve frequent actions
- P6-M01-T02.01 Keep navigation, save, preview and export actions discoverable.
- P6-M01-T02.02 Keep cover/back-cover canvas and controls functional.
- P6-M01-T02.03 Preserve theme/locale/account controls.
#### P6-M01-T03 — Measure result
- P6-M01-T03.01 Capture editor/cover before and after at 1440×900.
- P6-M01-T03.02 Assert workspace begins materially higher without clipping.
- P6-M01-T03.03 Validate 390/430/768 responsive hierarchy.

### ACCEPTANCE CRITERIA

GIVEN editor and Cover Studio at 1440×900, WHEN the compact workspace renders, THEN the primary editing/design surface begins materially higher than the baseline, AND project identity, stage navigation and frequent actions remain visible and usable.

## P6-M02 — Expert controls and cross-matrix validation

- **ID:** P6-M02
- **TITLE:** Prove premium editorial power survived simplification
- **OBJECTIVE:** verify progressive disclosure improves hierarchy without flattening Talent into a generic landing UI.
- **SOURCE_DRIVERS:** UX-15/16; SPEC §§7,24,32; DO_NOT_BREAK.
- **CURRENT_STATE:** controls are present but front-loaded; cross-matrix validation is incomplete.
- **TARGET_STATE:** content-first workspace coexists with composition rules, metadata, brand, publishing, history, shortcuts and preview/export continuity.
- **SCOPE:** power-user journeys and regression evidence.
- **OUT_OF_SCOPE:** new editorial capabilities.
- **DEPENDENCIES:** P6-M00, P6-M01.
- **PREREQUISITES:** all previous phases PASS.
- **RISKS:** hidden controls, changed defaults, theme/i18n regression.
- **DO_NOT_BREAK:** every global invariant in SPEC §32.
- **AFFECTED_ROUTES:** editor, chapters, cover, back-cover, preview, exports.
- **AFFECTED_COMPONENTS:** workspace and preserved specialist panels.
- **AFFECTED_API:** existing update/export APIs.
- **AFFECTED_DATA:** real-like synthetic project only.
- **AFFECTED_TESTS:** full editor regression and visual matrix.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert hierarchy/disclosure changes without deleting controls/data.
- **OBSERVABILITY:** control reachability matrix and saved-state assertions.
- **DOCUMENTATION_UPDATES:** premium readiness checklist.

### TASKS
#### P6-M02-T01 — Power-user reachability
- P6-M02-T01.01 Reach composition rules and verify defaults.
- P6-M02-T01.02 Reach metadata/brand/publishing/history controls.
- P6-M02-T01.03 Verify keyboard shortcuts and chapter formatting.
#### P6-M02-T02 — Cross-surface regression
- P6-M02-T02.01 Verify editor→preview→cover continuity.
- P6-M02-T02.02 Verify content/export corpus remains complete.
- P6-M02-T02.03 Verify themes/locales and responsive surfaces.
#### P6-M02-T03 — Premium review
- P6-M02-T03.01 Review visual evidence against premium/modal/localization contracts.
- P6-M02-T03.02 Record any intentional spacing/hierarchy decision.
- P6-M02-T03.03 Close or block UX-15/UX-16 based on measurable evidence.

### ACCEPTANCE CRITERIA

GIVEN a power user and a first-time author, WHEN both traverse the editor, THEN first-time work is primary and power-user controls remain reachable without data loss, AND preview, cover, formatting, defaults, locale/theme and export behavior remain intact.

## P6-FINAL-GATE

- P6-M00..M02 PASS.
- UX-15 and UX-16 have before/after geometry and journey evidence.
- G6/G8/G9 prove hierarchy and premium consistency.
- All expert controls and DO_NOT_BREAK invariants pass regression.
