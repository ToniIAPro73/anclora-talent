# P0 — Rebaseline / Contracts / Test Harness

Repo status: DONE

Execution status: P0-FINAL-GATE PASS. Baseline, source reconciliation, contract inventory, synthetic corpus, test tiers and workflow/AOS evidence are recorded. No product behavior changed in P0.

Objective: produce reproducible truth before product implementation. P0 changes documentation/test fixtures only; it does not change product behavior.

### EXECUTION MODE

- `CAVEMAN`: P0-M00-T01..T03, P0-M01-T01, P0-M04-T01, P0-M04-T03.
- Normal prose: P0-M01-T02..T03, P0-M02-T01..T03, P0-M03-T01..T03, P0-M04-T02, P0-FINAL-GATE.

## P0-M00 — Baseline freeze

- **ID:** P0-M00
- **TITLE:** Baseline freeze and worktree contract
- **OBJECTIVE:** record exact branch, heads, worktree, runtime and validation baseline.
- **SOURCE_DRIVERS:** SPEC §§2,4; AGENTS.md; current Git state.
- **CURRENT_STATE:** development and origin/development both `35d2a0d`; named branches synchronized; worktree clean; lint/tests/build green with documented warnings.
- **TARGET_STATE:** a checked-in baseline record can be reproduced by another agent.
- **SCOPE:** Git commands, runtime versions, current validation outputs, current deployment/workflow inventory.
- **OUT_OF_SCOPE:** product code, schema, deployment mutation.
- **DEPENDENCIES:** none.
- **PREREQUISITES:** repository checkout and Node/npm available.
- **RISKS:** remote heads move while executing; ignored build files mask accidental changes.
- **DO_NOT_BREAK:** clean baseline, no secrets in evidence, no product edits.
- **AFFECTED_ROUTES:** none.
- **AFFECTED_COMPONENTS:** none.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** baseline only.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert documentation-only baseline record.
- **OBSERVABILITY:** record command, timestamp, SHA and result.
- **DOCUMENTATION_UPDATES:** SPEC baseline and this status.

### TASKS

#### P0-M00-T01 — Capture Git truth

- P0-M00-T01.01 Run status/branch/HEAD/origin/log/remote commands.
- P0-M00-T01.02 Capture local heads for development, staging, production and main.
- P0-M00-T01.03 Record unrelated changes as blockers instead of overwriting them.

#### P0-M00-T02 — Capture runtime truth

- P0-M00-T02.01 Record package scripts and dependency versions from package-lock.
- P0-M00-T02.02 Record Next, Node and Playwright/Vitest execution versions.
- P0-M00-T02.03 Record Vercel and workflow configuration paths.

#### P0-M00-T03 — Capture validation truth

- P0-M00-T03.01 Run `npm run lint` and preserve warnings/errors separately.
- P0-M00-T03.02 Run `npm run test:run` and record file/test counts.
- P0-M00-T03.03 Run `npm run build` and record warnings without converting them to failures.

### ACCEPTANCE CRITERIA

GIVEN a clean `development` checkout, WHEN the baseline commands run, THEN the recorded branch and SHAs are reproducible, AND no ignored/generated artifact is treated as a product change.

## P0-M01 — Source and audit reconciliation

- **ID:** P0-M01
- **TITLE:** Reconcile original and re-audit sources
- **OBJECTIVE:** establish one current matrix for UX-01..UX-18 with explicit status and evidence.
- **SOURCE_DRIVERS:** original QA audit; re-audit MD/HTML/JSON; SPEC §§3–5.
- **CURRENT_STATE:** 11 historical findings remain present; 7 are newly formalized, with UX-15 historically discussed but newly identified.
- **TARGET_STATE:** every finding has current code evidence, browser evidence, root-cause confidence, target phase and action.
- **SCOPE:** source inventory, companion comparison, finding matrix and limitation register.
- **OUT_OF_SCOPE:** implementing a finding; declaring a browser gap a pass.
- **DEPENDENCIES:** P0-M00.
- **PREREQUISITES:** audit companions available locally.
- **RISKS:** date/HEAD metadata drift; methodology differences misread as regression.
- **DO_NOT_BREAK:** historical traceability and audit limitations.
- **AFFECTED_ROUTES:** all routes named by findings, read-only inventory.
- **AFFECTED_COMPONENTS:** evidence references only.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** audit companion only.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert matrix edits and restore source links.
- **OBSERVABILITY:** source path, line/evidence ID, confidence and status per row.
- **DOCUMENTATION_UPDATES:** SPEC matrix and ROADMAP traceability.

### TASKS

#### P0-M01-T01 — Inventory companions

- P0-M01-T01.01 Read the original audit and record its actual header date.
- P0-M01-T01.02 Read re-audit MD, HTML and JSON companion structures.
- P0-M01-T01.03 Mark historical/documentation drift without deleting history.

#### P0-M01-T02 — Reconcile findings

- P0-M01-T02.01 Map OLD-F01..OLD-F11 to UX-01..UX-11.
- P0-M01-T02.02 Enumerate UX-12..UX-18 and distinguish formalization from regression.
- P0-M01-T02.03 Verify each row against current source paths and current HEAD delta.

#### P0-M01-T03 — Classify evidence

- P0-M01-T03.01 Set status to CONFIRMED/RESOLVED/PARTIAL/SUPERSEDED/NOT_REPRODUCIBLE/BLOCKED only with evidence.
- P0-M01-T03.02 Separate root-cause certainty from finding certainty, especially UX-12.
- P0-M01-T03.03 Link each finding to phase, Gate, test and DO_NOT_BREAK invariant.

### ACCEPTANCE CRITERIA

GIVEN the two audit generations, WHEN the matrix is reviewed, THEN all 18 IDs appear exactly once with historical linkage, AND no methodology delta is labeled a regression without code evidence.

## P0-M02 — Architecture and domain contracts

- **ID:** P0-M02
- **TITLE:** Inventory document, export, auth, project, editor and i18n contracts
- **OBJECTIVE:** describe current implementation boundaries before proposing changes.
- **SOURCE_DRIVERS:** SDD, schema/migrations, source inventory, AOS.
- **CURRENT_STATE:** document blocks, composition, preview and exports are related but not one enforced artifact contract; auth and ownership helpers exist.
- **TARGET_STATE:** contract map identifies source of truth, derived projections, invariants and affected files for every finding.
- **SCOPE:** architecture graph and domain invariants.
- **OUT_OF_SCOPE:** refactor or schema migration.
- **DEPENDENCIES:** P0-M00, P0-M01.
- **PREREQUISITES:** source paths compile and tests are available.
- **RISKS:** confusing derived preview pages with persisted manuscript.
- **DO_NOT_BREAK:** stable IDs, order, ownership, cover/preview controls.
- **AFFECTED_ROUTES:** project editor, preview, cover, export, auth, inventory.
- **AFFECTED_COMPONENTS:** listed in SPEC source inventory.
- **AFFECTED_API:** auth/project/export routes.
- **AFFECTED_DATA:** ProjectRecord, document/chapter/block model, schema tables.
- **AFFECTED_TESTS:** composition, preview, export, auth and repository suites.
- **MIGRATION_IMPACT:** none for inventory.
- **ROLLBACK_STRATEGY:** remove incorrect contract statements and re-run source review.
- **OBSERVABILITY:** contract references and invariant checklist.
- **DOCUMENTATION_UPDATES:** SPEC §§8–20.

### TASKS

#### P0-M02-T01 — Document model map

- P0-M02-T01.01 Trace persisted ProjectRecord through chapters and blocks.
- P0-M02-T01.02 Trace block-to-HTML-to-composition-to-page flow.
- P0-M02-T01.03 Mark empty-document and conversion-failure states separately.

#### P0-M02-T02 — Auth/project map

- P0-M02-T02.01 Trace credential, session, OAuth and rate-limit boundaries.
- P0-M02-T02.02 Trace project ownership checks for read/write/export routes.
- P0-M02-T02.03 Trace inventory ordering, pagination and duplicate identity behavior.

#### P0-M02-T03 — Contract gap register

- P0-M02-T03.01 Record current semantic export gaps without designing code prematurely.
- P0-M02-T03.02 Record responsive/editor coupling and shell semantic gaps.
- P0-M02-T03.03 Record locale-owned versus hard-coded operational strings.

### ACCEPTANCE CRITERIA

GIVEN the current repository, WHEN an agent follows the contract map, THEN it can identify the persisted source and every derived projection for a project, AND it can name the invariant protecting ownership and chapter order.

## P0-M03 — Test, fixture and baseline evidence harness

- **ID:** P0-M03
- **TITLE:** Safe acceptance corpus and targeted browser harness
- **OBJECTIVE:** make data/document integrity and affected UX checks reproducible without production mutation.
- **SOURCE_DRIVERS:** SPEC §§31,37; existing Vitest/Playwright; audit limitations.
- **CURRENT_STATE:** unit suite is green; existing fixtures exist but no complete export corpus/inspector is authoritative.
- **TARGET_STATE:** synthetic fixtures and fast/phase/full test tiers are defined and runnable.
- **SCOPE:** fixture schema, artifact inspection contract, browser evidence naming and safe account policy.
- **OUT_OF_SCOPE:** production mutation and external OAuth completion.
- **DEPENDENCIES:** P0-M02.
- **PREREQUISITES:** Node tooling and existing test setup.
- **RISKS:** fixture content accidentally includes secrets; browser tests mutate shared projects.
- **DO_NOT_BREAK:** existing tests and fixture paths; no real-user data.
- **AFFECTED_ROUTES:** export, preview, auth, inventory, editor.
- **AFFECTED_COMPONENTS:** affected components only in test harness.
- **AFFECTED_API:** test calls to existing routes.
- **AFFECTED_DATA:** synthetic in-memory/fixture projects only.
- **AFFECTED_TESTS:** new focused suites and existing regression suite.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** remove fixture/harness additions without source changes.
- **OBSERVABILITY:** artifact manifest, screenshot/trace names, test tier labels.
- **DOCUMENTATION_UPDATES:** corpus and test tier sections in SPEC/ROADMAP.

### TASKS

#### P0-M03-T01 — Define corpus

- P0-M03-T01.01 Define empty, one-chapter and multiple-chapter synthetic projects.
- P0-M03-T01.02 Add headings, paragraphs, lists, emphasis, links, images and ES/EN characters.
- P0-M03-T01.03 Add duplicate titles, cover and back-cover metadata cases.

#### P0-M03-T02 — Define inspectors

- P0-M03-T02.01 Define HTML DOM checks for headings, paragraphs, order and characters.
- P0-M03-T02.02 Define DOCX XML checks for editable runs, headings, images and order.
- P0-M03-T02.03 Define PDF text-layer/page checks and explicit image-fidelity assertions.

#### P0-M03-T03 — Define browser tiers

- P0-M03-T03.01 Define FAST, PHASE and FULL test commands and evidence paths.
- P0-M03-T03.02 Define read-only production versus mutating fixture environments.
- P0-M03-T03.03 Define viewport/theme/locale/persona sampling per phase.

### ACCEPTANCE CRITERIA

GIVEN a synthetic populated project, WHEN the future export inspector runs, THEN it can detect missing manuscript content even when a file has valid bytes, AND no fixture requires a real user's project.

## P0-M04 — Deployment, AOS and documentation-drift contract

- **ID:** P0-M04
- **TITLE:** Govern implementation and promotion
- **OBJECTIVE:** bind future execution to current AOS, workflows and branch chain.
- **SOURCE_DRIVERS:** AGENTS.md, AOS_ADOPTION.md, standards, `.github/workflows/`, Vercel config.
- **CURRENT_STATE:** manual workflows implement development→staging→production→main; AOS v0.2.0 adopted with exceptions; some historical docs remain.
- **TARGET_STATE:** every phase has a promotion record, drift classification, rollback and no-destructive production rule.
- **SCOPE:** workflow inspection, AOS checklist, documentation authority map.
- **OUT_OF_SCOPE:** changing workflows or Vercel configuration.
- **DEPENDENCIES:** P0-M00..M03.
- **PREREQUISITES:** GitHub workflow files and AOS declaration available.
- **RISKS:** promoting a documentation or code change before CI/environment validation.
- **DO_NOT_BREAK:** no force push, no branch skip, no direct protected-branch work.
- **AFFECTED_ROUTES:** none.
- **AFFECTED_COMPONENTS:** none.
- **AFFECTED_API:** none.
- **AFFECTED_DATA:** none.
- **AFFECTED_TESTS:** CI/workflow validation.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** stop promotion; revert phase commit on development only after evidence.
- **OBSERVABILITY:** SHA chain and CI/workflow run IDs.
- **DOCUMENTATION_UPDATES:** SPEC §§21,38–40 and roadmap closure schema.

### TASKS

#### P0-M04-T01 — Verify real workflows

- P0-M04-T01.01 Read CI and three promotion workflow commands.
- P0-M04-T01.02 Record merge strategy, validation steps and permissions.
- P0-M04-T01.03 Define the exact dispatch order and stop conditions.

#### P0-M04-T02 — Verify AOS/standards

- P0-M04-T02.01 Read AOS adoption status and active exceptions.
- P0-M04-T02.02 Read modal, localization and premium contracts applicable to Talent.
- P0-M04-T02.03 Record conflicts as drift/escalation instead of inventing AOS requirements.

#### P0-M04-T03 — Define closure evidence

- P0-M04-T03.01 Define phase evidence record with all four SHAs and validations.
- P0-M04-T03.02 Define documentation states CURRENT/STALE/HISTORICAL/SUPERSEDED/UNKNOWN.
- P0-M04-T03.03 Define no-destructive production smoke and rollback triggers.

### ACCEPTANCE CRITERIA

GIVEN a phase that has passed its product Gate, WHEN promotion is attempted, THEN the existing workflows are used in order, AND a failed CI or environment validation prevents the next promotion.

## P0-FINAL-GATE

### Required checks

- P0-M00..M04 complete.
- `git status --short --branch` contains only intended P0 documentation/harness work.
- `npm run lint`, `npm run test:run` and `npm run build` pass.
- AOS, workflow and source precedence checklists are recorded.
- All 18 findings are reconciled and every P0 output is linked from the ROADMAP.
- No product code, schema, deployment or real-user data changed.

### Result rules

`PASS` permits P1 implementation. `FAIL` or `BLOCKED` prohibits a P0 close commit, push and promotion.
