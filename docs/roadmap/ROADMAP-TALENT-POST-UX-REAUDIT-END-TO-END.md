# ROADMAP — Anclora Talent Post-UX Re-audit / End-to-End

Status: AUTHORITATIVE EXECUTION PLAN

Product/architecture authority: [`SPEC-TALENT-POST-UX-REAUDIT-END-TO-END.md`](../specs/SPEC-TALENT-POST-UX-REAUDIT-END-TO-END.md)

Phase detail authority: the linked `P*.md` files under [`talent-post-ux-reaudit/`](./talent-post-ux-reaudit/). They expand this roadmap; they do not redefine the SPEC.

## 0. Execution rules

- Start every implementation phase from `development`.
- A phase closes only at `P?-FINAL-GATE = PASS`.
- `FAIL` or `BLOCKED` stops commit-close, push and promotion for that phase.
- `PASS_WITH_GAPS` is not a phase result.
- No direct work on `staging`, `production` or `main`.
- No force push and no history rewrite.
- Production validation is read-only smoke; mutating E2E uses local, preview, staging or dedicated authorized fixtures.
- This authoring change contains no product implementation and does not start P0 implementation.

Small microtask PASS is local evidence only. It does not require commit, push or promotion. Accumulate related safe microtasks into a meaningful batch. Use commit/push/promotion at microphase closure, phase closure, or earlier only when integrity, security, migration or rollback risk requires a checkpoint. A batch must contain enough coherent change to justify CI and environment promotion; do not create release churn for one trivial edit.

## 0.1 Selective CAVEMAN execution mode

Use `CAVEMAN` only for low-judgment, repetitive microtasks: command runs, file inventories, counts, screenshot capture, parser execution, evidence indexing and diff/status checks. Use normal technical prose for integrity decisions, security, auth recovery, migrations, rollback, Gate results, release decisions and promotion. Mixed task: normal prose.

When `CAVEMAN` is active, report only action, result and evidence path. Never omit failure, `BLOCKED`, security or data-integrity detail.

Phase detail files mark recommended ID ranges under `EXECUTION MODE`. This is a communication/token policy, not a product or test-result state.

## 1. Master phase table

Repo status describes the starting state observed at `35d2a0d`; it is not a Gate result.

| Phase | Objective | Repo status | Dependencies | Detail | Microphases | Tasks | Microtasks | Gates |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| P0 | Rebaseline, contracts, fixtures and harness | PARTIAL | none | [P0](./talent-post-ux-reaudit/P0-REBASELINE.md) | 5 + final | 15 | 45 | G0,G1,G2,G3,G4,G10,G11,G13,G14,G15,G16,G19 |
| P1 | Document and export integrity; UX-12 | NEEDS_HARDENING | P0 PASS | [P1](./talent-post-ux-reaudit/P1-DOCUMENT-EXPORT-INTEGRITY.md) | 5 + final | 15 | 45 | G1,G2,G3,G4,G5,G10,G11,G12,G13,G14,G15,G17,G18,G19 |
| P2 | Immediate accessibility and navigation; UX-05..09, UX-18 | NEEDS_HARDENING | P0 PASS; P1 integrity contract | [P2](./talent-post-ux-reaudit/P2-ACCESSIBILITY-NAVIGATION.md) | 4 + final | 12 | 36 | G0,G1,G3,G4,G5,G6,G7,G8,G9,G10,G11,G12,G13,G14,G15,G16,G19 |
| P3 | Auth recovery/error recovery/parity; UX-02,03,10 | MISSING | P0 PASS; P2 semantic primitives | [P3](./talent-post-ux-reaudit/P3-AUTH-RECOVERY.md) | 3 + final | 11 | 33 | G1,G3,G4,G5,G7,G10,G11,G12,G13,G14,G15,G16,G19 |
| P4 | Semantic export, mobile authoring and i18n; UX-13,14,17 | NEEDS_HARDENING | P1 PASS; P2 PASS | [P4](./talent-post-ux-reaudit/P4-SEMANTIC-EXPORT-MOBILE-I18N.md) | 4 + final | 14 | 42 | G1,G2,G3,G4,G5,G6,G7,G8,G9,G10,G11,G12,G13,G14,G15,G16,G17,G18,G19 |
| P5 | Retrieval, preview continuity and modal surface; UX-01,04,11 | NEEDS_HARDENING | P1 PASS; P2 PASS; P4 semantic corpus | [P5](./talent-post-ux-reaudit/P5-RETRIEVAL-PREVIEW.md) | 4 + final | 12 | 36 | G1,G3,G4,G5,G6,G7,G8,G9,G10,G11,G12,G13,G14,G15,G16,G19 |
| P6 | Editorial workspace and progressive disclosure; UX-15,16 | NEEDS_HARDENING | P2,P4,P5 PASS | [P6](./talent-post-ux-reaudit/P6-EDITORIAL-WORKSPACE.md) | 3 + final | 9 | 27 | G1,G3,G4,G5,G6,G7,G8,G9,G10,G11,G12,G13,G14,G15,G16,G19 |
| P7 | Full regression, release and promotion readiness | MISSING | P0–P6 PASS | [P7](./talent-post-ux-reaudit/P7-FULL-REGRESSION-RELEASE.md) | 3 + final | 9 | 27 | G0–G20 as applicable |

## 2. Microphase index

| Phase | Microphases in execution order |
| --- | --- |
| P0 | P0-M00 Baseline freeze; P0-M01 source reconciliation; P0-M02 architecture/domain contracts; P0-M03 test/fixture harness; P0-M04 deployment/AOS/drift contract; P0-FINAL-GATE |
| P1 | P1-M00 canonical document/export contract; P1-M01 root-cause reproduction; P1-M02 acceptance corpus; P1-M03 fail-closed observability; P1-M04 artifact validation; P1-FINAL-GATE |
| P2 | P2-M00 landmarks and native navigation; P2-M01 names and target sizing; P2-M02 responsive shell; P2-M03 dialog keyboard lifecycle; P2-FINAL-GATE |
| P3 | P3-M00 registration validation; P3-M01 password recovery; P3-M02 social-auth parity and negative security; P3-FINAL-GATE |
| P4 | P4-M00 semantic DOCX; P4-M01 semantic standard PDF and explicit visual capability; P4-M02 mobile authoring; P4-M03 operational i18n; P4-FINAL-GATE |
| P5 | P5-M00 canonical retrieval; P5-M01 full inventory; P5-M02 quick switcher; P5-M03 immediate preview and modal surface; P5-FINAL-GATE |
| P6 | P6-M00 progressive disclosure contract; P6-M01 workspace hierarchy; P6-M02 expert controls and cross-matrix validation; P6-FINAL-GATE |
| P7 | P7-M00 full matrix/regression; P7-M01 non-destructive environment validation; P7-M02 evidence/document closure; P7-FINAL-GATE / FINAL RELEASE GATE |

## 3. Global Gate catalog

Every Gate has a result of `PASS`, `FAIL`, `BLOCKED` or `NOT_APPLICABLE`. A required Gate with a gap is `FAIL` or `BLOCKED`, never `PASS_WITH_GAPS`.

| Gate | Purpose | Inputs | Commands | PASS condition | FAIL condition | BLOCKED condition | Required evidence | Rollback trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G0 Repository / baseline integrity | protect starting state | branch, status, SHAs | `git status --short --branch`; `git diff --exit-code`; `git rev-parse` | expected branch/clean scope and recorded SHAs | accidental/unrelated change | remote/branch cannot be verified | baseline block + final diff | restore phase work before close |
| G1 Architecture / contract consistency | ensure implementation follows SPEC/AOS | SPEC, SDD, contracts, code | targeted `rg`; `npm run lint`; review | no contradiction in affected contract | code violates contract | required authority unavailable | contract checklist | revert phase |
| G2 Data / schema integrity | protect persisted data | schema, migrations, fixtures | `npm run test:run -- ...`; migration diff review | no unauthorized migration/data loss | schema/order/ownership regression | DB unavailable for required read-only check | schema/test output | revert before promotion |
| G3 Domain invariants | preserve document/project invariants | canonical fixture, project actions | focused Vitest suites | IDs, order, ownership and content preserved | any invariant mismatch | required fixture cannot load | invariant assertions | revert |
| G4 Authorization / security | preserve auth/ownership | routes, sessions, negative fixtures | focused auth tests; authorized Playwright | no cross-user access, no enumeration | leak/bypass/token issue | provider/email secret unavailable | negative test evidence | immediate stop and revert |
| G5 Functional behavior | verify intended behavior | affected route/component | focused tests + Playwright | GIVEN/WHEN/THEN all pass | behavior or recovery fails | external dependency unavailable | test report and trace | revert |
| G6 UX | verify task continuity | user journey, copy, hierarchy | Playwright + screenshots | measurable action/visibility criterion passes | extra action, unclear state or lost content | required browser unavailable | screenshot/trace/criteria | revert |
| G7 Accessibility | verify semantics/keyboard | axe, DOM, keyboard | `npx playwright test` targeted; axe | no critical violations; keyboard contract passes | critical axe/name/focus failure | browser/assistive test unavailable | axe JSON, keyboard trace | revert |
| G8 Visual consistency | preserve premium language | before/after screenshots, tokens | Playwright screenshot comparison/review | no unintended theme/layout regression | clipping, contrast or surface regression | baseline cannot render | before/after artifacts | revert |
| G9 Responsive | verify viewport behavior | 1440,768,390,430 matrix | targeted Playwright | no forbidden clipping/overlap; intentional scroll documented | overflow/overlap/hidden action | viewport cannot be tested | screenshot + DOM geometry | revert |
| G10 Unit / integration | verify deterministic code | focused tests | `npm run test:run -- <paths>` | all affected tests pass | any failure | dependency/runtime missing | console summary | fix/revert |
| G11 E2E | verify end-to-end journey | safe fixtures/account | `npx playwright test <spec>` | journey completes without unsafe mutation | journey fails | authorized fixture/account unavailable | trace, screenshots, report | revert |
| G12 Negative / isolation | verify failure safety | invalid auth, empty export, cross-user IDs | focused tests/E2E | fails closed, no enumeration/data leak | apparent success or leak | negative fixture unavailable | response/assertion evidence | immediate rollback |
| G13 Regression | protect adjacent journeys | baseline suite and DO_NOT_BREAK | `npm run test:run`; `npm run build`; E2E | no existing contract regression | any adjacent journey fails | environment unavailable | diff and reports | phase cannot close |
| G14 Documentation | keep authority current | SPEC, ROADMAP, evidence | link/heading/grep checks; review | docs state, status and evidence match code | stale/contradictory docs | source cannot be read | updated paths + status | no close commit |
| G15 AOS / architecture compliance | enforce governance | AOS, standards, SDD | manual checklist + path checks | no unapproved AOS conflict | conflict/drift unrecorded | delegated source unavailable | AOS checklist | revert/document escalation |
| G16 i18n | verify ES/EN parity | locale dictionary and rendered paths | parity tests + Playwright ES/EN | no operational mixed-language surface | hard-coded/mixed copy | locale path unavailable | rendered evidence + parity output | revert |
| G17 Export artifact integrity | verify complete artifacts | synthetic corpus + outputs | checked-in inspector + XML/text/image parsers | titles/headings/paragraphs/order/chars/images/metadata complete | empty/placeholder/truncated artifact | parser/runtime unavailable | artifact manifest and hashes | block export release |
| G18 Semantic document integrity | verify editable/selectable semantics | DOCX XML, PDF text layer | XML inspection, `pdftotext`/`pdfinfo` where available | DOCX editable text; standard PDF selectable readable text | image-only or missing text | tooling unavailable | semantic inspection report | revert export phase |
| G19 Performance / timeout | protect bounded flows | timing and route config | focused perf tests; build; route smoke | within declared budgets and timeout | timeout/unbounded loop | timing environment unavailable | timings and config | revert |
| G20 Production smoke | verify promoted release safely | production URLs, read-only account | read-only Playwright/HTTP smoke | routes/auth/preview/export availability without mutation | production regression | deployment/credentials unavailable | SHA + smoke report | halt promotion |

## 4. PHASE DEPENDENCY GRAPH

```text
P0
 ├──> P1 ───────┐
 ├──> P2 ──┐    │
 └─────────┼──> P3
           └──> P4 ──┐
P1 + P2 + P4 ────────┼──> P5 ──┐
P2 + P4 + P5 ────────────────> P6 ──┐
P0..P6 PASS ────────────────────────> P7 FINAL RELEASE
```

P1 is intentionally before visual polish. P4 depends on P1's canonical document and artifact corpus. P5 may preserve a quick switcher, but cannot define retrieval semantics independently. P6 cannot compact workspace chrome until mobile, export and navigation contracts are stable.

## 5. CRITICAL PATH

`P0-M00 → P0-M03 → P1-M00 → P1-M01 → P1-M03 → P1-M04 → P1-FINAL-GATE → P4-M00 → P4-M01 → P4-M02 → P5-M00 → P5-M03 → P6-M00 → P7-M00 → P7-M02 → P7-FINAL-GATE`.

The longest-risk segment is canonical document proof → fail-closed export → semantic artifacts → mobile/editor regression. Accessibility P2 can proceed after P0 and before P4, but cannot release ahead of P1's integrity contract.

## 6. Finding-to-phase matrix

| Finding | Historical ID | Severity | Priority | Root cause | Phase | Microphase | Gates | Tests | DO_NOT_BREAK | Final acceptance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UX-01 | OLD-F01 | HIGH | P1 | launcher-only preview | P5 | P5-M03 | G5,G6,G11,G13 | preview component/E2E | full preview/pagination | first useful document visible on entry |
| UX-02 | OLD-F02 | HIGH | P1 | unavailable recovery styled as link | P3 | P3-M01 | G4,G5,G10,G12 | auth route/security/E2E | masking, feedback, no enumeration | truthful usable recovery or explicit supported next action |
| UX-03 | OLD-F03 | MEDIUM | P2 | coarse server error mapping | P3 | P3-M00 | G4,G5,G10,G16 | register route/component | values/pending guard | field correction and focus are clear |
| UX-04 | OLD-F04 | HIGH | P1 | split inventory model | P5 | P5-M00..M02 | G3,G4,G5,G6,G11 | retrieval/inventory/E2E | pagination, dates, identity | intended project found by title/recency without scan |
| UX-05 | OLD-F05 | MEDIUM | P2 | generic page wrappers | P2 | P2-M00 | G6,G7,G11 | landmark/axe/E2E | auth links/forms | meaningful main landmark exists |
| UX-06 | OLD-F06 | MEDIUM | P2 | icon-sized target | P2 | P2-M01 | G6,G7,G9,G11 | auth component/E2E | password behavior | target ≥44×44 and named |
| UX-07 | OLD-F07 | HIGH | P1 | unnamed icon actions | P2 | P2-M01 | G3,G6,G7,G11 | chapter component/E2E | boundary disable/order | action name includes verb/chapter |
| UX-08 | OLD-F08 | MEDIUM | P2 | fixed shell width competition | P2 | P2-M02 | G6,G8,G9,G11 | shell responsive/E2E | theme/locale controls | no 390px overlap |
| UX-09 | OLD-F09 | MEDIUM | P2 | router button wrapper | P2 | P2-M00 | G5,G7,G11 | link component/E2E | pending feedback/auth | native destination link |
| UX-10 | OLD-F10 | LOW | P3 | asymmetric auth entry | P3 | P3-M02 | G4,G5,G7,G11 | OAuth entry tests | provider gating/link policy | supported providers discoverable in sign-up |
| UX-11 | OLD-F11 | LOW | P3 | translucent modal surface | P5 | P5-M03 | G6,G8,G9,G11 | modal visual/E2E | table/pagination/close | background cannot compete |
| UX-12 | — | CRITICAL | P1 | document projection divergence | P1 | P1-M00..M04 | G1,G2,G3,G5,G10,G17,G18 | corpus/export route/artifact | manuscript/order/ownership | populated HTML/DOCX complete; empty output fails |
| UX-13 | — | HIGH | P1 | image-first export builders | P4 | P4-M00..M01 | G5,G10,G17,G18 | DOCX/PDF semantic | cover/pagination/visual option | editable DOCX + selectable standard PDF |
| UX-14 | — | HIGH | P1 | publication mode coupled to viewport | P4 | P4-M02 | G6,G7,G9,G11,G13 | editor responsive/E2E | desktop spread/shortcuts/format | no mobile clipping |
| UX-15 | — | MEDIUM | P2 | setup and expert controls co-primary | P6 | P6-M00 | G5,G6,G8,G11 | workspace/component/E2E | defaults/rules/brand | writing/import action primary |
| UX-16 | — | MEDIUM | P2 | stacked stage chrome | P6 | P6-M01 | G6,G8,G9,G11 | geometry/visual/E2E | identity/navigation/canvas | workspace begins materially higher |
| UX-17 | — | MEDIUM | P2 | copy outside locale contract | P4 | P4-M03 | G5,G7,G11,G16 | messages/import/export/E2E | manuscript language | no mixed operational language |
| UX-18 | — | HIGH | P1 | incomplete bespoke dialog lifecycle | P2 | P2-M03 | G6,G7,G9,G11,G12 | modal keyboard/E2E | pagination/row actions | focus enters/stays/restores; Escape closes |

## 7. Evidence and promotion record

For this authoring run, the release operation stops after commit and push to
`origin/development`; no promotion workflow is dispatched. The promotion
record below is the required evidence format for later implementation phases.

Each future phase must append or link a closure record with this schema:

```text
PHASE: P?
DEVELOPMENT_SHA:
DEVELOPMENT_CI: PASS | FAIL | BLOCKED
STAGING_SHA:
STAGING_VALIDATION: PASS | FAIL | BLOCKED
PRODUCTION_SHA:
PRODUCTION_SMOKE: PASS | FAIL | BLOCKED
MAIN_SHA:
SYNC_STATUS: PASS | FAIL | BLOCKED
```

The current authoring change records its own documentation Gate in the final response; it does not claim product-phase evidence.
