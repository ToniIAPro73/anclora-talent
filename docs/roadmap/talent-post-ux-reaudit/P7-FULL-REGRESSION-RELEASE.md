# P7 — Full Regression / Premium Readiness / Release

Repo status: DONE

Execution status: P7-M00 PASS; P7-M01 PASS under the active
`development`-only release policy; P7-M02 PASS; P7-FINAL-GATE PASS.
`G20` and staging/production/main validation are `NOT_APPLICABLE` for this
run because the user explicitly restricted release mechanics to commit and
push on `origin/development`. This is functional readiness evidence, not a
claim that the unpromoted environments contain the phase.

Objective: prove the full product contract and promote only a verified phase chain.

### EXECUTION MODE

- `CAVEMAN`: P7-M00-T01..T02, P7-M02-T01..T02.
- Normal prose: P7-M00-T03, all P7-M01 promotion tasks, P7-M02-T03 and P7-FINAL-GATE.

## P7-M00 — Full matrix and regression

- **ID:** P7-M00
- **TITLE:** Execute the applicable end-to-end matrix
- **OBJECTIVE:** run desktop/tablet/mobile, light/dark, ES/EN and persona coverage with evidence.
- **SOURCE_DRIVERS:** SPEC §§32,37,40; all finding Gates.
- **CURRENT_STATE:** P0–P6 implementation Gates are PASS; the full release matrix and current development tree still require one consolidated proof.
- **TARGET_STATE:** all affected journeys and DO_NOT_BREAK invariants are covered by appropriate fast/phase/full tiers, with every unavailable environment dimension explicitly classified.
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

### EXECUTION EVIDENCE

- `npm run lint`: PASS; four pre-existing warnings, zero errors.
- `npm run test:run`: PASS; 184 files, 1,153 tests.
- `npm run build`: PASS; Next.js production build completed. Existing Turbopack NFT tracing warning remains documented.
- Phase-close development commit: `5156de3009eed3b3efb26244196fa265c9ca7098`; development CI run `34531852009`: PASS.
- Export corpus/semantic tests: PASS; 2 files, 11 tests.
- P4/P5/P6 focused E2E on isolated authorized Neon branch: P4 2/2 PASS, P5 2/2 PASS, P6 1/1 PASS when run single-worker. A concurrent combined run produced one non-reproducible P6 reload miss; the isolated rerun passed.
- Historical responsive regression at 375×667: PASS, 1/1.
- Matrix evidence covers 1440×900, 390×844 and 430×932; P4 covers ES/light and EN/dark; P6 covers desktop hierarchy and mobile containment; existing suite covers remaining auth, cover, preview, export and i18n journeys.
- Known non-blocking browser diagnostics: `NEXT_REDIRECT` is logged by the existing server-action catch path during successful form redirects; existing hydration timing warning comes from `DocumentHealthPanel` telemetry. Neither changed test result or product data.

## P7-M01 — Development-only environment validation

- **ID:** P7-M01
- **TITLE:** Validate development and close release-policy boundary
- **OBJECTIVE:** separate safe environment checks from mutating E2E and record why promotion is deferred for this run.
- **SOURCE_DRIVERS:** SPEC §§21,30,38; workflow files.
- **CURRENT_STATE:** development is the only authorized release target for this execution; protected environment promotion is intentionally disabled by user policy.
- **TARGET_STATE:** development CI is recorded PASS, promotion is explicitly `NOT_APPLICABLE`, and no unverified environment is represented as released.
- **SCOPE:** development CI, branch/status verification, read-only local/isolated validation and policy evidence.
- **OUT_OF_SCOPE:** staging/production/main workflow dispatch, production smoke without explicit authorization, real-user writes and manual branch merges.
- **DEPENDENCIES:** P7-M00.
- **PREREQUISITES:** authorized read-only account and GitHub workflow permissions.
- **RISKS:** accidentally implying production readiness or dispatching an unauthorized promotion.
- **DO_NOT_BREAK:** branch order, no force push, no data writes.
- **AFFECTED_ROUTES:** local/isolated landing/auth/dashboard/preview/export availability.
- **AFFECTED_COMPONENTS:** current development build only.
- **AFFECTED_API:** local/isolated routes only.
- **AFFECTED_DATA:** dedicated Neon branch fixtures only; no production mutation.
- **AFFECTED_TESTS:** development CI and safe E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** stop chain; revert only through normal development-first process.
- **OBSERVABILITY:** workflow run IDs, commit SHAs and smoke report.
- **DOCUMENTATION_UPDATES:** phase promotion record.

### TASKS
#### P7-M01-T01 — Development CI
- P7-M01-T01.01 Push approved phase close commit to development.
- P7-M01-T01.02 Wait for CI and record result/run ID.
- P7-M01-T01.03 Stop on failure and do not dispatch promotion.
#### P7-M01-T02 — Promotion chain (`NOT_APPLICABLE`)
- P7-M01-T02.01 Do not dispatch development→staging under the active user-selected policy.
- P7-M01-T02.02 Do not dispatch staging→production under the active user-selected policy.
- P7-M01-T02.03 Do not dispatch production→main under the active user-selected policy.
#### P7-M01-T03 — Smoke safety and boundary evidence
- P7-M01-T03.01 Use isolated local/Neon fixtures and authorized account only.
- P7-M01-T03.02 Verify no production content was created, edited or deleted.
- P7-M01-T03.03 Record development SHA/CI and mark staging/production/main as `NOT_APPLICABLE`.

### ACCEPTANCE CRITERIA

GIVEN a phase-close batch with PASS Gates, WHEN the active development-only policy applies, THEN development CI is PASS and promotion tasks are `NOT_APPLICABLE`, AND no staging/production/main workflow or mutation occurs.

## P7-M02 — Evidence and documentation closure

- **ID:** P7-M02
- **TITLE:** Close traceability and document known gaps
- **OBJECTIVE:** leave an auditable product authority for the next execution.
- **SOURCE_DRIVERS:** SPEC §§22,36,38–40; authoring Gate.
- **CURRENT_STATE:** SPEC/ROADMAP are authored; P0–P6 implementation evidence exists and P7 evidence is being closed.
- **TARGET_STATE:** all findings, Gates, tests, rollback decisions, drift statuses and development-only release records are current.
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
- P7-M02-T03.01 Add phase SHA/CI record and explicit `NOT_APPLICABLE` values for staging/production/main.
- P7-M02-T03.02 Add final test/artifact/visual evidence index.
- P7-M02-T03.03 Obtain final reviewer sign-off against SPEC and AOS.

### ACCEPTANCE CRITERIA

GIVEN the completed roadmap, WHEN another agent reads the SPEC, ROADMAP and evidence index, THEN every current finding and Gate has an unambiguous disposition, AND known gaps are visible rather than implied as PASS.

## P7-FINAL-GATE / FINAL RELEASE GATE

- P7-M00..M02 PASS.
- G0–G20 applicable results are PASS or NOT_APPLICABLE with rationale; no required Gate is FAIL/BLOCKED.
- All 18 findings are traceable and accepted.
- Full test, build, artifact, semantic, accessibility, responsive, i18n and security evidence is complete; production read-only smoke is `NOT_APPLICABLE` under the active release override.
- Promotion record has development CI evidence; staging/production/main SHAs and sync status are `NOT_APPLICABLE` because no promotion was authorized.
- No direct protected-branch work or force push occurred.
- Only then may development functional readiness be `PASS`. This result does not claim production release.
