# P7 — Full Regression / Premium Readiness / Release

Repo status: MISSING

Objective: prove the full product contract and promote only a verified phase chain.

## P7-M00 — Full matrix and regression

- **ID:** P7-M00
- **TITLE:** Execute the applicable end-to-end matrix
- **OBJECTIVE:** run desktop/tablet/mobile, light/dark, ES/EN and persona coverage with evidence.
- **SOURCE_DRIVERS:** SPEC §§32,37,40; all finding Gates.
- **CURRENT_STATE:** current suite is green but audit coverage is partial and non-mutating.
- **TARGET_STATE:** all affected journeys and DO_NOT_BREAK invariants are covered by appropriate fast/phase/full tiers.
- **SCOPE:** full tests, Playwright, axe, artifact corpus, visual evidence.
- **OUT_OF_SCOPE:** new product changes discovered during testing; those become a new roadmap item.
- **DEPENDENCIES:** P0–P6 PASS.
- **PREREQUISITES:** all test/fixture tooling and evidence conventions.
- **RISKS:** false confidence from skipped/blocked browser cases.
- **DO_NOT_BREAK:** every SPEC §32 invariant.
- **AFFECTED_ROUTES:** landing/auth/dashboard/projects/editor/cover/back-cover/preview/exports.
- **AFFECTED_COMPONENTS:** all affected components.
- **AFFECTED_API:** auth/project/export APIs through safe fixtures.
- **AFFECTED_DATA:** dedicated fixtures only.
- **AFFECTED_TESTS:** full unit/integration/E2E suite.
- **MIGRATION_IMPACT:** no new migration.
- **ROLLBACK_STRATEGY:** no release if any mandatory matrix cell fails/blocks without disposition.
- **OBSERVABILITY:** reports, traces, screenshots, artifact manifests and timings.
- **DOCUMENTATION_UPDATES:** final matrix and known gaps.

### TASKS
#### P7-M00-T01 — Execute automated suite
- P7-M00-T01.01 Run lint, full tests and build.
- P7-M00-T01.02 Run all relevant Playwright specs and axe checks.
- P7-M00-T01.03 Run export corpus and semantic inspectors.
#### P7-M00-T02 — Execute visual/responsive matrix
- P7-M00-T02.01 Capture 1440/768/390/430 evidence.
- P7-M00-T02.02 Capture light/dark and ES/EN affected surfaces.
- P7-M00-T02.03 Review intentional local scroll versus clipping/overlap.
#### P7-M00-T03 — Review invariants
- P7-M00-T03.01 Verify manuscript/order/IDs/ownership and project isolation.
- P7-M00-T03.02 Verify preview/pagination/cover/device/shortcut behavior.
- P7-M00-T03.03 Verify auth/recovery/export failure safety.

### ACCEPTANCE CRITERIA

GIVEN the applicable full matrix, WHEN all automated and visual checks run, THEN every mandatory cell is PASS or explicitly NOT_APPLICABLE with evidence, AND no DO_NOT_BREAK invariant is unverified.

## P7-M01 — Non-destructive environment validation

- **ID:** P7-M01
- **TITLE:** Validate preview/staging/production without mutating user data
- **OBJECTIVE:** separate safe production read-only smoke from mutating E2E and record environment SHAs.
- **SOURCE_DRIVERS:** SPEC §§21,30,38; workflow files.
- **CURRENT_STATE:** production browser evidence exists but deployed SHA match is unknown; no full promotion record for this mission yet.
- **TARGET_STATE:** each environment is validated read-only and promotion evidence is complete.
- **SCOPE:** workflow dispatch, CI, read-only smoke and SHA chain.
- **OUT_OF_SCOPE:** real-user writes, destructive test or manual branch merge outside workflows.
- **DEPENDENCIES:** P7-M00.
- **PREREQUISITES:** authorized read-only account and GitHub workflow permissions.
- **RISKS:** production mutation, stale deployment, failed merge/CI.
- **DO_NOT_BREAK:** branch order, no force push, no data writes.
- **AFFECTED_ROUTES:** read-only landing/auth/dashboard/preview/export availability.
- **AFFECTED_COMPONENTS:** deployed build only.
- **AFFECTED_API:** GET/read-only routes only.
- **AFFECTED_DATA:** no production mutation.
- **AFFECTED_TESTS:** smoke and CI.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** stop chain; revert only through normal development-first process.
- **OBSERVABILITY:** workflow run IDs, commit SHAs and smoke report.
- **DOCUMENTATION_UPDATES:** phase promotion record.

### TASKS
#### P7-M01-T01 — Development CI
- P7-M01-T01.01 Push approved phase close commit to development.
- P7-M01-T01.02 Wait for CI and record result/run ID.
- P7-M01-T01.03 Stop on failure and do not dispatch promotion.
#### P7-M01-T02 — Promotion chain
- P7-M01-T02.01 Dispatch development→staging workflow and validate staging.
- P7-M01-T02.02 Dispatch staging→production workflow and validate production.
- P7-M01-T02.03 Dispatch production→main workflow and verify main sync.
#### P7-M01-T03 — Smoke safety
- P7-M01-T03.01 Use read-only routes and dedicated authorized account only.
- P7-M01-T03.02 Verify no production content was created/edited/deleted.
- P7-M01-T03.03 Record SHA/CI/smoke evidence for all four branches.

### ACCEPTANCE CRITERIA

GIVEN a phase-close commit with PASS Gates, WHEN it is promoted, THEN the existing workflow chain runs development→staging→production→main in order, AND any CI/smoke failure stops the chain without production mutation.

## P7-M02 — Evidence and documentation closure

- **ID:** P7-M02
- **TITLE:** Close traceability and document known gaps
- **OBJECTIVE:** leave an auditable product authority for the next execution.
- **SOURCE_DRIVERS:** SPEC §§22,36,38–40; authoring Gate.
- **CURRENT_STATE:** SPEC/ROADMAP are authored; future phase evidence is not yet available.
- **TARGET_STATE:** all findings, Gates, tests, rollback decisions, drift statuses and promotion records are current.
- **SCOPE:** docs, traceability, release notes and evidence links.
- **OUT_OF_SCOPE:** silently closing blocked/unknown work.
- **DEPENDENCIES:** P7-M00, P7-M01.
- **PREREQUISITES:** all reports and SHAs available.
- **RISKS:** stale status or undocumented known gaps.
- **DO_NOT_BREAK:** authority precedence and historical record.
- **AFFECTED_ROUTES:** none.
- **AFFECTED_COMPONENTS:** none.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** doc/link checks and final suite.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** no close if docs contradict evidence.
- **OBSERVABILITY:** final status matrix and evidence index.
- **DOCUMENTATION_UPDATES:** SPEC, ROADMAP, phase status and final release record.

### TASKS
#### P7-M02-T01 — Traceability closure
- P7-M02-T01.01 Verify UX-01..UX-18 each has phase/microphase/Gates/tests.
- P7-M02-T01.02 Verify every mandatory Gate has evidence/result.
- P7-M02-T01.03 Verify DO_NOT_BREAK and rollback records.
#### P7-M02-T02 — Drift/known gaps
- P7-M02-T02.01 Classify docs CURRENT/STALE/HISTORICAL/SUPERSEDED/UNKNOWN.
- P7-M02-T02.02 Record blocked audit dimensions without downgrading product claims.
- P7-M02-T02.03 Record follow-up work as new scope rather than hidden gaps.
#### P7-M02-T03 — Release packet
- P7-M02-T03.01 Add phase SHA/CI/staging/production/main record.
- P7-M02-T03.02 Add final test/artifact/visual evidence index.
- P7-M02-T03.03 Obtain final reviewer sign-off against SPEC and AOS.

### ACCEPTANCE CRITERIA

GIVEN the completed roadmap, WHEN another agent reads the SPEC, ROADMAP and evidence index, THEN every current finding and Gate has an unambiguous disposition, AND known gaps are visible rather than implied as PASS.

## P7-FINAL-GATE / FINAL RELEASE GATE

- P7-M00..M02 PASS.
- G0–G20 applicable results are PASS or NOT_APPLICABLE with rationale; no required Gate is FAIL/BLOCKED.
- All 18 findings are traceable and accepted.
- Full test, build, artifact, semantic, accessibility, responsive, i18n, security and production read-only smoke evidence is complete.
- Promotion record has development/staging/production/main SHAs and sync status.
- No direct protected-branch work or force push occurred.
- Only then may the release result be `PASS`.
