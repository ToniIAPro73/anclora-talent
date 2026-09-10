# SPEC — Anclora Talent Post-UX Re-audit Remediation / End-to-End

Status: AUTHORITATIVE FOR FUTURE IMPLEMENTATION

Date authored: 2026-09-10

Repository: `ToniIAPro73/anclora-talent`

Canonical implementation branch: `development`

This specification is the product, architecture, integrity and release authority for the remediation roadmap. The execution authority for phase order, microtasks, evidence and Gates is [`ROADMAP-TALENT-POST-UX-REAUDIT-END-TO-END.md`](../roadmap/ROADMAP-TALENT-POST-UX-REAUDIT-END-TO-END.md). A future agent MUST follow both documents and MUST NOT reinterpret an audit finding from screenshots alone.

## 1. EXECUTIVE SUMMARY

Anclora Talent is a premium editorial application for creating, editing, composing, previewing and exporting publication projects. The current repository is healthy at the unit-test and production-build level, but its product truth contains a critical continuity break: a populated manuscript can be previewed while HTML and DOCX downloads contain an empty placeholder, and the standard PDF is image-only. This makes export transport success an unsafe proxy for deliverable correctness.

The remediation is therefore sequenced by risk rather than visual novelty:

1. establish a reproducible baseline and fixture corpus;
2. restore canonical document and export integrity;
3. close immediate accessibility and navigation blockers;
4. make authentication recovery and registration errors truthful;
5. separate semantic export from visual fidelity, fit the physical mobile editor and close i18n gaps;
6. make project retrieval and preview continuous without removing the quick switcher;
7. give the editorial workspace progressive disclosure while preserving expert controls;
8. run full regression, promotion and release gates.

The initial authoring pass established the documentation authority. Functional execution is active from `development`; P0, P1, P2 and P3 are complete. Password recovery requires the documented deployment email variables before delivery is enabled; absent configuration fails closed. The current product code, tests, schema, AOS declaration and audit artifacts remain the baseline authority.

## EXECUTION STATUS

`P0-FINAL-GATE: PASS`. `P1-FINAL-GATE: PASS`. `P2-FINAL-GATE: PASS`. `P3-M00: PASS`. `P3-M01: PASS`. `P3-M02: PASS`. `P3-FINAL-GATE: PASS`. P1 protects populated chapter fallback, editable DOCX manuscript content, selectable standard PDF content and fail-closed HTML/DOCX/PDF artifact checks. P2 adds native navigation, landmarks, target/name contracts, responsive shell containment and real modal focus behavior. P3 adds secure password recovery, localized registration recovery and signup OAuth parity without changing auth boundaries. Production delivery remains disabled until documented email variables are configured.

## 2. BASELINE

### 2.1 Git baseline

| Field | Value |
| --- | --- |
| `BASELINE_HEAD` | `35d2a0dd5f021caf6cf0da81a8d1674b0f09e7cd` |
| `ORIGIN_DEVELOPMENT_HEAD` | `35d2a0dd5f021caf6cf0da81a8d1674b0f09e7cd` |
| Branch at authoring start | `development` |
| Worktree before authoring | clean; `development...origin/development` |
| Local heads | `development`, `staging`, `production`, `main` all at `35d2a0d` |
| Remote | `git@github.com:ToniIAPro73/anclora-talent.git` |
| Remote sync | `development` synchronized at baseline |
| Branch drift | none detected between local named branches |
| Product code changed by this mission | no |

The September 9 re-audit metadata names `812167aed8fcb49eb0643ceb0caa3e75d175a016` as its audited HEAD. Current `development` contains only audit/governance commits after that point (`676633b`, `466c180`, `8deccc0`, `e85039b`, merge `35d2a0d`) and no product-code change after the audited product state. That permits code-level confirmation of the findings while preserving the limitation that the production deployed SHA is not independently proven.

### 2.2 Current execution baseline

| Area | Current truth |
| --- | --- |
| Stack | Next.js `16.2.1`, React `19.2.4`, TypeScript `^5`, TipTap `^3.22.2`, Drizzle `^0.45.2`, Neon serverless, Vercel Blob, Vitest `^4.1.2`, Playwright `^1.59.1`, `docx` `^9.6.1`, `@react-pdf/renderer` `^4.3.2` |
| Lint | PASS, 2 pre-existing warnings in audit tooling/E2E code; 0 errors |
| Unit/integration | PASS: 175 files, 1122 tests |
| Build | PASS: Next/Turbopack production build; one non-blocking NFT tracing warning through export surface rendering |
| Browser model | Playwright configuration and E2E specs exist; full safe authenticated mutation coverage is not established |
| Database | Drizzle schema and 17 migration snapshots/SQL migrations are present; no migration is authorized by this spec |
| Auth | bcrypt password verification, opaque sessions, Google/GitHub OAuth with PKCE, rate-limit helpers and ownership guards exist |
| Export routes | HTML, DOCX, PDF and EPUB routes exist; HTML/DOCX/PDF integrity/semantics remain separate acceptance obligations |
| Deployment | Vercel project metadata exists; CI validates push/PR branches; promotion is manual through three workflow-dispatch workflows |
| Product state | Paused since 2026-08 according to README/AOS context; this roadmap is the authority for a future controlled reactivation |

### 2.3 Baseline commands

The authoring Gate records these commands and their results:

```text
git status --short --branch                 PASS
git branch --show-current                   development
git rev-parse HEAD                          35d2a0d...
git rev-parse origin/development            35d2a0d...
git log --oneline -15                       PASS
git remote -v                               PASS
npm run lint                                PASS (2 warnings, 0 errors)
npm run test:run                            PASS (175 files / 1122 tests)
npm run build                               PASS (Turbopack NFT warning)
```

## 3. SOURCE INVENTORY

### 3.1 Mandatory audit sources

| Source | Classification | Use |
| --- | --- | --- |
| `docs/audits/anclora-talent-ux-reaudit-2026-09-09.md` | CURRENT audit artifact | readable narrative, evidence, 18 findings, scorecards and limitations |
| `docs/audits/anclora-talent-ux-reaudit-2026-09-09.html` | CURRENT companion | rendered/validated companion; 18 findings and 48 sections |
| `docs/audits/anclora-talent-ux-reaudit-2026-09-09.json` | CURRENT machine source | structured findings, evidence, delta, recommended roadmap and coverage |
| `sdd/qa/qa-uxui-audit-v1.md` | HISTORICAL audit | original H1–H6 evidence and stated limitations; its header says 2026-08-05 although the requested historical comparison calls it 2026-09-05 |
| `e2e/qa-uxui-audit-v1.spec.ts` | HISTORICAL executable companion | original audit journey/test intent |

The re-audit companions were read as a set. The JSON was used to enumerate every structured finding and the HTML was treated as a rendered companion, not a stronger authority than code or tests.

### 3.2 Repository and governance sources

`README.md`, `README.en.md`, `AGENTS.md`, `.anclora/AOS_ADOPTION.md`, `.anclora/AGENT_PROJECT_CONTEXT.md`, `package.json`, `package-lock.json`, `sdd/product.md`, `sdd/architecture.md`, `sdd/data-model.md`, `sdd/composition-engine.md`, `sdd/roadmap.md`, `docs/standards/README.md`, `docs/standards/MODAL_CONTRACT.md`, `docs/standards/LOCALIZATION_CONTRACT.md`, `docs/standards/ANCLORA_PREMIUM_APP_CONTRACT.md`, `docs/standards/TALENT_COLOR_PALETTE.md`, `docs/PREVIEW_INTEGRATION.md`, `docs/ADVANCED_EDITOR_TESTING.md`, and `docs/EDITOR_PREFERENCES.md` were read for current scope and constraints.

### 3.3 Implementation sources inspected

The baseline inventory includes:

- `src/lib/document/*`, `src/lib/compose/*`, `src/lib/preview/*`, `src/lib/projects/export-builder.tsx`, `src/lib/projects/export-content-blocks.ts`, `src/lib/projects/types.ts`;
- `src/app/api/projects/export/{route,docx, pdf}/route.ts`, EPUB route, import route and auth routes;
- `src/lib/db/schema.ts`, repositories, migrations and migration snapshots;
- `src/components/projects/PreviewCanvas.tsx`, `PreviewModal.tsx`, `ProjectsTableModal.tsx`, `ChapterOrganizer.tsx`, `AdvancedRichTextEditor.tsx`, `ChapterEditorFullscreen.tsx`, `ProjectWorkspace.tsx`, `DocumentRulesPanel.tsx`, `DocumentImporter.tsx`, `PdfExportButton.tsx`, cover/back-cover components;
- `src/components/layout/AppShell.tsx`, `src/components/ui/NavigatingLink.tsx`, auth components and `src/lib/i18n/messages.ts`;
- existing unit/component tests under `src/` and E2E specs under `e2e/`;
- `.github/workflows/ci.yml`, `promote-development-to-staging.yml`, `promote-staging-to-production.yml`, `promote-production-to-main.yml`, `validate-agent-branch.yml`, `next.config.ts`, `vercel.json`, `drizzle.config.ts` and `playwright.config.ts`.

### 3.4 Structural reference

The local `/Users/toni/Developer/anclora/anclora-shiftimport` repository was available. Its SPEC, root ROADMAP and `shiftimport-mvp-v2/00-ROADMAP-MASTER.md` were inspected for governance shape only: baseline, source reconciliation, product truth, phase/microphase/task/microtask decomposition, Gates, evidence, closure and promotion. No ShiftImport domain or functional decision is imported here.

## 4. SOURCE PRECEDENCE

The following order is normative for all future execution:

1. current code on `development`;
2. executable tests and contracts on `development`;
3. current schema and migrations;
4. AOS and applicable local standards;
5. September 9 re-audit;
6. historical audit material;
7. historical documentation and memory.

When a screenshot, report or document conflicts with current code/tests, the discrepancy is documented and verified; it is not silently converted into a product requirement. The re-audit wins over the original interpretation only where it is consistent with current code. A methodology delta is not a product regression.

## 5. SOURCE RECONCILIATION

The current code and September 9 evidence reconcile all 18 findings as follows. `CONFIRMED` means the product defect remains actionable. It does not mean every safe mutation journey was executed in production.

### SOURCE_RECONCILIATION_MATRIX

| Historical ID | Current ID | Title | Audit 01 severity | Audit 02 severity | Audit 02 priority | Old status | Current status | Current code evidence | Current browser evidence | Root cause confirmed | Change class | Action required | Target phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OLD-F01 | UX-01 | Preview entry provides no document until a second action | CRITICAL | HIGH | P1 | STILL_PRESENT | CONFIRMED | `PreviewCanvas.tsx` returns launcher-only panel | B-047/B-046 | YES | historical present | Render first composed page inline; retain full preview | P5 |
| OLD-F02 | UX-02 | Password recovery is a non-interactive promise | HIGH | HIGH | P1 | STILL_PRESENT | PARTIALLY_RESOLVED | recovery request/reset routes, secure token model and UI exist; deployment email boundary is not configured in local env | B-080/B-071; P3 route/component/security tests | YES | historical present | Configure transactional email and verify authorized delivery smoke; no enumeration | P3 |
| OLD-F03 | UX-03 | Registration validation does not explain what to correct | HIGH | MEDIUM | P2 | STILL_PRESENT | RESOLVED | register route codes map to localized field errors, `aria-describedby` and first-invalid focus | signup-error/B-083; P3 component and route tests | YES | historical present | Invalid fields state correction and preserve valid input | P3 |
| OLD-F04 | UX-04 | 57 projects require manual scanning across two inventories | HIGH | HIGH | P1 | STILL_PRESENT | CONFIRMED | modal and `/projects` use separate views; no query/filter | B-067/B-068 | YES | historical present | Shared retrieval model with search, recency, useful filters | P5 |
| OLD-F05 | UX-05 | Public/auth surfaces lack a main landmark | HIGH | MEDIUM | P2 | STILL_PRESENT | CONFIRMED | landing/auth wrappers lack coherent landmarks | B-028/B-080/B-085 | YES | historical present | One meaningful `main`, labeled navigation groups | P2 |
| OLD-F06 | UX-06 | Password visibility toggle remains about 18×18px | MEDIUM | MEDIUM | P2 | STILL_PRESENT | CONFIRMED | icon defines button dimensions without target padding | B-080/B-085 | YES | historical present | 44×44px target, preserved icon/name/input space | P2 |
| OLD-F07 | UX-07 | Chapter move/delete controls remain unnamed | MEDIUM | HIGH | P1 | STILL_PRESENT | CONFIRMED | `ChapterOrganizer.tsx` icon-only move/delete buttons | B-003 / code line 151 | YES | historical present | Localized action + chapter name, boundary disabled state | P2 |
| OLD-F08 | UX-08 | Mobile brand text overlaps navigation button | HIGH | MEDIUM | P2 | STILL_PRESENT | CONFIRMED | `AppShell.tsx` plus shell CSS min-width conflict | B-016/B-012 | YES | historical present | Compact identity and non-overlapping responsive header | P2 |
| OLD-F09 | UX-09 | Navigation destinations are buttons | MEDIUM | MEDIUM | P2 | STILL_PRESENT | CONFIRMED | `NavigatingLink.tsx` calls `router.push` from `<button>` | B-068/B-047 | YES | historical present | Native links with pending feedback; buttons only for state change | P2 |
| OLD-F10 | UX-10 | Social auth entry points absent from sign-up | LOW | LOW | P3 | STILL_PRESENT | RESOLVED | sign-up reuses server OAuth availability and renders the same Google/GitHub entries as sign-in | B-071/B-083; component and existing OAuth tests | YES | historical present | Enabled providers are discoverable with unchanged PKCE/state/linking | P3 |
| OLD-F11 | UX-11 | Project modal transparency competes with table reading | LOW | LOW | P3 | STILL_PRESENT | CONFIRMED | translucent panel/backdrop in modal CSS | B-067 / code line 46 | YES | historical present | Opaque theme-aware surface and overlay token | P5 |
| — | UX-12 | HTML/DOCX omit populated chapter content | — | CRITICAL | P1 | NEW / different coverage | CONFIRMED | `projectToSemanticDocument` can produce zero blocks; placeholder fallback; server/client composition split | B-049/B-003/B-025; downloaded artifacts | PARTIAL: fallback is confirmed; deployed runtime cause requires proof | new coverage | Canonical document, fail-closed export and artifact inspection | P1 |
| — | UX-13 | Word/PDF downloads are image-only documents | — | HIGH | P1 | NEW / different coverage | CONFIRMED | DOCX builder embeds page images; PDF content path image-first | B-025; DOCX XML/PDF text extraction | YES | new coverage | Semantic DOCX/PDF capability distinct from image fidelity | P4 |
| — | UX-14 | Mobile chapter editor opens clipped desktop spread | — | HIGH | P1 | NEW / different coverage | CONFIRMED | fullscreen editor keeps persisted spread/device geometry | B-020/B-021 | YES | new coverage | Physical viewport adapter, single fitted column below breakpoint | P4 |
| — | UX-15 | First editor step exposes composition before writing | — | MEDIUM | P2 | NEW / formalized historical concern | CONFIRMED | `ProjectWorkspace` and rules panel front-load optional controls | B-024 | YES | new formalization | Progressive disclosure; keep defaults and expert access | P6 |
| — | UX-16 | Large stage headers relegate editorial workspace | — | MEDIUM | P2 | NEW / different coverage | CONFIRMED | stage/progress/chrome stack precedes work surface | B-024/B-004 | YES | new coverage | Compact headers after onboarding; measurable workspace gain | P6 |
| — | UX-17 | English workflows retain Spanish controls/status copy | — | MEDIUM | P2 | NEW / different coverage | CONFIRMED | strings exist outside `messages.ts` in importer/templates/PDF status | B-016/B-001/B-025 | YES | new coverage | Locale-owned operational copy and rendered parity tests | P4 |
| — | UX-18 | Project modal lacks focus containment and Escape close | — | HIGH | P1 | NEW / different coverage | CONFIRMED | bespoke `role=dialog` has no focus lifecycle | B-037 / modal keyboard | YES | new coverage | Real dialog contract: initial focus, trap, Escape, restoration | P2 |

At authoring baseline no UX-01..UX-18 was `RESOLVED`, `PARTIALLY_RESOLVED` or `SUPERSEDED`. During functional execution, UX-03 and UX-10 are `RESOLVED` by code and tests; UX-02 remains `PARTIALLY_RESOLVED` until deployment email configuration and authorized delivery smoke. UX-12's root-cause diagnosis remains a deliberate `PARTIAL` investigation state, not a reason to weaken the finding or accept an empty artifact.

## 6. PRODUCT TRUTH

### 6.1 Current product promise

Talent promises a continuous editorial path: source or idea → project structure → writing and formatting → brand/cover → preview → export. The strongest current foundations are the TipTap editor, live cover canvas, full preview pagination, composition engine, ownership guards, theme/locale controls and existing export routes.

### 6.2 Current observed truth

- The landing and credential auth surfaces render and are reachable.
- A project inventory exists at modal and `/projects` surfaces; the audited account contained 57 projects, modal pagination works and update-date ordering exists.
- Chapter content is represented as persisted structured blocks and is visible to the editor/full preview.
- Preview entry is a launcher, so the first useful document appears after another action.
- HTML and DOCX can transport a file while losing populated chapter content; DOCX is image-only in the current builder.
- Standard PDF output is visually rendered through page images and lacks a selectable text layer in the audited artifact.
- The physical mobile editor is not the same concern as publication/export device mode and is currently clipped.
- Safe mutation journeys, OAuth completion, session recovery and production deployed SHA were not fully proven by the audits.

### 6.3 Audit limitations that remain explicit

Production read-only smoke and authorized test accounts are allowed. Real-user production mutations, real email delivery, external OAuth consent and destructive project operations are not. A missing browser execution is `BLOCKED` or `NOT_EVALUATED`, never an inferred pass.

## 7. PRODUCT PROMISE

After remediation, an author must be able to trust that the document seen in the editor and preview is the document delivered by every advertised export capability. Recovery, navigation, retrieval and responsive authoring must be understandable without removing professional composition power. Premium quality means clarity, continuity and editorial focus, not hiding expert controls.

## 8. CURRENT ARCHITECTURE

The application is a Next.js App Router application with React client components, server routes/actions, Drizzle/Neon persistence, Vercel Blob support, TipTap authoring, a structured composition engine and export builders. `ProjectRecord` is the application aggregate; its document contains ordered chapters and structured content blocks, composition rules and metadata. Preview/export adapters project that document into pages and format-specific artifacts.

The architecture has two related representations that must be reconciled by P1/P4:

1. persisted document blocks and client composition used by editor/preview;
2. HTML-to-block server parsing and image/page rendering used by exports.

The remediation MUST create one validated semantic projection as the contract between them. It MUST NOT make the server silently turn a populated document into `[]`.

## 9. DOMAIN MODEL

| Domain object | Current responsibility | Invariant |
| --- | --- | --- |
| User/session | bcrypt credentials, opaque session, OAuth identity | every authenticated read/write is user-scoped |
| Project | title, status, ownership, metadata, updatedAt | project belongs to one owner/workspace boundary |
| Document | ordered chapters, rules, metadata and composition inputs | persisted manuscript is never discarded by presentation changes |
| Chapter | stable ID, title, order and blocks | order is explicit and preserved across preview/export |
| Content block | heading, paragraph, list, quote, image and inline content | semantic meaning survives projection |
| Cover/back cover | publication surfaces and live canvas settings | cover fidelity and project identity survive export changes |
| Composition result | deterministic pages, anchors and page metadata | derived; never the sole source of manuscript truth |
| Export artifact | HTML/DOCX/PDF/EPUB output | transport success is subordinate to artifact integrity |
| Retrieval view | project summaries, search/filter/sort/pagination | view-specific presentation shares canonical retrieval semantics |

## 10. DOCUMENT MODEL

The canonical document is the persisted structured document and its ordered chapters. HTML is an interchange/rendering projection, not an authority that may erase blocks. Future implementation MUST define:

- deterministic chapter order and stable chapter IDs;
- block preservation for headings, paragraphs, lists, emphasis, links, quotes and images;
- an explicit empty-document state distinct from a populated-document conversion failure;
- a validation result containing source block count, chapter count, output block count and stable content digest;
- a document-language rule: UI locale does not translate user-authored manuscript content.

## 11. EXPORT MODEL

Exports are separate capabilities over the same canonical document:

| Capability | Current route/builder | Target contract |
| --- | --- | --- |
| HTML | `/api/projects/export`, `renderProjectExportHtml` | semantic headings, paragraphs, lists, links, images, order and metadata; no silent empty placeholder |
| DOCX semantic | `/api/projects/export/docx`, `buildProjectDocxBuffer` | editable text runs/paragraphs/headings/lists and images where applicable |
| PDF standard | `/api/projects/export/pdf`, `buildProjectPdfWithConfig` | selectable, readable text and stable document structure where supported |
| PDF visual fidelity | current page-image capability | explicitly labeled separate capability; never silently substituted for standard PDF |
| EPUB | `/api/projects/export/epub` | existing route remains outside current finding scope but uses the same corpus/gates where affected |

For every format, `artifact_integrity` includes transport status, structural validation, content completeness, order, character preservation, images and relevant metadata. `file downloaded = PASS` is prohibited.

## 12. AUTH MODEL

Credential auth uses bcrypt helpers, session cookies and server-side guards. OAuth uses Google/GitHub provider configuration, Authorization Code + PKCE, transaction cookies, rate limits and identity linking logic. Future recovery implementation MUST use single-use expiring tokens, stored as a secure hash or equivalent non-recoverable representation, invalidation on use, rate limiting, generic responses that do not enumerate accounts, transactional email boundary and negative tests. No recovery code is authorized in this authoring mission.

## 13. PROJECT MODEL

The full inventory and quick switcher may remain distinct surfaces. They MUST share retrieval semantics: ownership scope, query normalization, recency ordering, filters, duplicate-title disambiguation, stable identity and pagination. A quick switcher is allowed only if it is explicitly optimized for resume/open and does not become a second inconsistent inventory.

## 14. EDITOR MODEL

The editor preserves TipTap formatting, page/chapter navigation, device/publication options, composition rules, brand metadata, cover controls, history and shortcuts. Physical editor viewport is a layout concern; publication/export device is a document/output concern. Narrow screens use a fitted single-column authoring surface without changing persisted export preferences.

## 15. PREVIEW MODEL

Preview must have an immediate useful state: cover and first content page when a composed result exists, with a localized full-screen action. Full preview remains available with pagination, device controls, zoom and close behavior. Preview and export share the validated semantic document but may differ in visual shell.

## 16. I18N MODEL

Supported locales are ES and EN, with ES default. Every visible operational string, including transient status and error text, belongs to the locale contract. User-authored manuscript text, project titles and external/provider names are not translated. Existing `messages.ts` is the current dictionary, but P4 must inventory strings outside it (importer, template labels, back cover, PDF status, preview and auth).

## 17. ACCESSIBILITY MODEL

The target is a meaningful web accessibility pass for affected journeys, not a regex pass. Required evidence includes:

- one meaningful `main` landmark and labeled navigation groups where applicable;
- native links for destinations and buttons for state changes;
- accessible names with target context for chapter actions;
- at least 44×44 CSS-pixel interactive target for password visibility controls where layout permits;
- visible focus, keyboard order and no focus loss;
- real dialog lifecycle for project modal: initial focus, containment, Escape dismissal, `aria-modal` behavior and restoration;
- axe results interpreted with browser evidence;
- semantic exported documents, not only web UI semantics.

## 18. RESPONSIVE MODEL

Required viewport acceptance matrix: 1440×900 desktop, 768px tablet, 390×844 and 430×932 mobile. At narrow editor widths there is no horizontal clipping of the document text, no forced desktop spread and no requirement to change publication/export device mode. Desktop spread remains available at supported desktop widths.

## 19. APPLICATION SHELL MODEL

The shell remains premium, dark/light, ES/EN and editorial. Project identity, language/theme preferences, account access and frequent navigation remain visible. Mobile header uses compact identity and separated controls. Stage chrome is compacted only after the identity/navigation contract remains clear.

## 20. CURRENT TEST ARCHITECTURE

Vitest covers domain, auth, composition, preview, exports, import, schema-adjacent repositories, i18n and components. Playwright covers auth, OAuth entry, redirects, landing, composition, cover, visual import and the historical audit. The current test suite is green but does not yet provide the required corpus-level artifact inspection, dialog focus lifecycle, semantic PDF/DOCX assertions, safe recovery journey or complete ES/EN viewport matrix.

Future tests are layered:

1. pure unit/contract tests for semantic projection, validation and retrieval;
2. integration tests for routes, ownership, auth errors and artifacts;
3. component tests for labels, links, landmarks and disclosure;
4. Playwright safe E2E for affected journeys;
5. artifact inspection using parsers/XML/text extraction, not byte size alone;
6. visual evidence at phase Gates.

## 21. DEPLOYMENT / BRANCH MODEL

Implementation starts from `development`, never directly from `staging`, `production` or `main`. CI is defined in `.github/workflows/ci.yml` and runs on push/PR for the four named branches. Promotion is manual via the repository workflows:

1. `promote-development-to-staging.yml` checks out `staging`, merges `origin/development` with `--no-ff`, validates and pushes;
2. `promote-staging-to-production.yml` validates, merges `origin/staging` into `production`, pushes and optionally tags;
3. `promote-production-to-main.yml` validates, merges `origin/production` into `main`, then pushes.

No force push, history rewrite or branch skipping is permitted. A failed CI, final Gate or environment validation stops promotion.

## 22. FINDING TRACEABILITY MATRIX

The complete execution matrix is in the ROADMAP. The compact authority mapping is:

### FINDING_TO_PHASE_MATRIX

| Finding | Root-cause cluster | Phase/microphase | Mandatory Gates |
| --- | --- | --- | --- |
| UX-01 | preview continuity | P5-M03 | G5, G6, G11, G13 |
| UX-02 | auth recovery/error contract | P3-M01 | G4, G5, G10, G12 |
| UX-03 | auth validation feedback | P3-M00 | G4, G5, G10, G16 |
| UX-04 | retrieval model | P5-M00/P5-M01/P5-M02 | G3, G4, G5, G6, G11 |
| UX-05 | semantic shell | P2-M00 | G6, G7, G11 |
| UX-06 | target sizing | P2-M01 | G6, G7, G9, G11 |
| UX-07 | accessible chapter actions | P2-M01 | G3, G6, G7, G11 |
| UX-08 | responsive shell | P2-M02 | G6, G8, G9, G11 |
| UX-09 | navigation semantics | P2-M00 | G5, G7, G11 |
| UX-10 | auth surface parity | P3-M02 | G4, G5, G7, G11 |
| UX-11 | modal surface | P5-M03 | G6, G8, G9, G11 |
| UX-12 | canonical document/export integrity | P1-M00..P1-M04 | G1, G2, G3, G5, G10, G17, G18 |
| UX-13 | semantic export capabilities | P4-M00/P4-M01 | G5, G10, G17, G18 |
| UX-14 | physical mobile editor | P4-M02 | G6, G7, G9, G11, G13 |
| UX-15 | progressive disclosure | P6-M00/P6-M02 | G5, G6, G8, G11 |
| UX-16 | workspace hierarchy | P6-M01 | G6, G8, G9, G11 |
| UX-17 | locale ownership | P4-M03 | G5, G7, G11, G16 |
| UX-18 | dialog keyboard lifecycle | P2-M03 | G6, G7, G9, G11, G12 |

## 23. ROOT-CAUSE CLUSTERS

| Cluster | Findings | Root cause | Remediation principle |
| --- | --- | --- | --- |
| C1 Canonical document/export divergence | UX-12, UX-13 | multiple projections and page-image-first builders do not enforce source completeness | one semantic document, fail closed, explicit visual capability |
| C2 Semantic interaction primitives | UX-05, UX-07, UX-09, UX-18 | bespoke wrappers/icons/modal omit native semantics and keyboard lifecycle | use design-system primitives or complete semantic contracts |
| C3 Responsive shell and authoring geometry | UX-06, UX-08, UX-14 | fixed dimensions and icon geometry ignore physical viewport | responsive adapters preserve desktop capability and authoring readability |
| C4 Auth/error truth | UX-02, UX-03, UX-10 | unavailable recovery and coarse server error mapping; asymmetric entry surfaces | truthful recovery contract, field errors, consistent provider entry |
| C5 Retrieval/continuity | UX-01, UX-04, UX-11 | launcher-first preview and two inventory renderers; modal surface lacks separation | canonical retrieval/view model and immediate useful state |
| C6 Workspace hierarchy/localization | UX-15, UX-16, UX-17 | optional controls and hard-coded operational copy compete with authoring | progressive disclosure and locale-owned copy |

## 24. TARGET PRODUCT STATE

The target is a dependable editorial studio: the document remains the primary object; preview and exports are projections of the same validated content; quick retrieval scales beyond dozens of projects; navigation is native and accessible; auth states are honest; the mobile editor is usable; specialist controls remain available through progressive disclosure; and ES/EN plus dark/light are complete across affected flows.

## 25. NON-FUNCTIONAL REQUIREMENTS

- Deterministic semantic projection for identical project input.
- No silent data loss or placeholder success for populated content.
- Stable IDs, ordering and ownership boundaries.
- No new hard-coded user-facing operational copy.
- No focus traps that allow background interaction or destructive-action autofocus.
- No horizontal clipping at required mobile editor widths.
- Existing desktop spread and composition defaults remain available.
- Export failures are observable, actionable and non-sensitive.
- Phase Gates produce reproducible evidence under versioned commands.

## 26. SECURITY REQUIREMENTS

Preserve bcrypt, session cookie behavior, OAuth PKCE/state, rate limits, authorization guards, ownership checks and user/project isolation. Recovery must not reveal account existence. Export endpoints must re-check ownership and must not log manuscript content, tokens, email addresses or artifact payloads. Test fixtures use synthetic accounts/projects only.

## 27. ACCESSIBILITY REQUIREMENTS

Affected journeys must pass targeted axe with no unresolved critical violations, have correct landmarks/names/roles, visible focus and keyboard completion. Dialog behavior is behavioral, not declarative: initial focus, containment, Escape, close button, `aria-modal` and restoration are all required. Exported DOCX/PDF acceptance includes content semantics appropriate to the chosen capability.

## 28. RESPONSIVE REQUIREMENTS

The required matrix is 1440×900, 768px, 390×844 and 430×932, each in light and dark where supported. Evidence must record intentional local scrolling separately from clipping. The mobile editor must fit the physical viewport without changing publication/export configuration.

## 29. INTERNATIONALIZATION REQUIREMENTS

ES is default; EN is complete. The locale contract owns labels, headings, errors, pending states, import instructions, template names, cover/back-cover controls, preview controls, auth copy and modal copy. Long translated strings must not clip or create inaccessible targets.

## 30. PERFORMANCE REQUIREMENTS

No new unbounded export work or client re-composition loop. Existing composition budgets and timeout settings remain explicit. Export routes retain runtime/max-duration configuration, but may return a structured failure when validation cannot complete. Retrieval must not load or expose another user's projects.

## 31. DATA / DOCUMENT INTEGRITY REQUIREMENTS

The acceptance corpus MUST include: empty project; one chapter; multiple chapters; headings H1–H6; paragraphs; lists; emphasis; links; images; ES characters; EN characters; duplicate titles; cover; back cover. Every HTML/DOCX/PDF artifact must be checked for titles, headings, paragraphs, complete content, chapter order, characters, images when present and relevant metadata. An empty or placeholder artifact from a populated source is FAIL.

## 32. DO_NOT_BREAK

The following are global invariants:

- persisted manuscripts and populated chapter content;
- chapter order, stable IDs, project data and update ordering;
- ownership, auth boundaries and user/project isolation;
- full preview, its pagination, device controls and zoom;
- Cover Studio live canvas and WYSIWYG behavior;
- publication/export device options and composition defaults;
- theme and locale preferences;
- current login feedback and password masking;
- working pagination and document formatting;
- existing keyboard shortcuts;
- public APIs and routes unless a migration is explicit and backward-compatible;
- named existing row actions and safe delete confirmation;
- expert composition, metadata, brand, publishing and history controls.

## 33. OUT_OF_SCOPE

The initial authoring pass did not implement product findings, change schema, alter auth providers, send email, run destructive production E2E, migrate users, redesign the brand from scratch, remove expert capabilities, replace the existing export stack without a compatibility plan, or promote an unverified artifact. Functional execution now proceeds phase by phase from this authority. Historical audit H1–H6 are supporting context, not automatic new remediation phases; they must only be reopened if current code/tests reproduce them.

## 34. MIGRATION IMPACT

Expected remediation is application-layer first. A database migration is not required for labels, landmarks, targets, links, modal lifecycle, export validation, semantic artifact generation, mobile layout, i18n or disclosure. A migration is allowed only if a phase proves that retrieval metadata/filtering or recovery token persistence cannot be implemented safely with existing tables, and then requires a separate schema Gate, forward/backward compatibility proof and rollback plan.

## 35. ROLLBACK STRATEGY

Each microphase is independently revertible. Rollback triggers include any integrity regression, cross-user read, failed artifact validation, lost chapter order/content, broken full preview, focus escape, mobile clipping, build/CI failure or promotion failure. Revert the phase commit on `development`, re-run its predecessor Gates, and do not promote the revert until CI and environment validation pass. Never use force push or history rewrite.

## 36. OBSERVABILITY

Critical flows expose structured diagnostic events without sensitive content:

- `export.requested`, `export.composition_failed`, `export.integrity_failed`, `export.completed`;
- correlation/request ID when an existing platform pattern is available;
- format, project ID hash or opaque request identifier, source block/chapter counts, output counts, validation class and duration;
- user-safe localized recovery state and retry guidance;
- no manuscript body, password, token, email or artifact payload in logs.

## 37. TEST STRATEGY

### 37.1 Viewport/theme/locale/persona matrix

| Dimension | Values |
| --- | --- |
| Desktop | 1440×900 |
| Tablet | 768px width |
| Mobile | 390×844, 430×932 |
| Theme | light, dark |
| Locale | ES, EN |
| Persona | anonymous, first-time, returning author, power user |

### 37.2 Costed coverage tiers

- FAST GATE: affected unit/component tests, lint, targeted artifact contract, one desktop ES light and one mobile ES dark smoke.
- PHASE GATE: all affected unit/integration tests, relevant Playwright journeys, ES/EN, light/dark, 1440/390, artifact corpus for export phases, axe/keyboard for accessibility phases.
- FULL RELEASE GATE: complete applicable matrix, regression suite, build, E2E, artifact corpus and no-destructive environment checks. Production smoke and promotion are required only when release policy authorizes them; under the active development-only override they are `NOT_APPLICABLE` and must not be represented as completed.

## 38. RELEASE STRATEGY

For this specification-authoring execution, the user-selected release
override is `development`-only: create the documentation commit, push it to
`origin/development`, wait for development CI, and do not dispatch promotion
to staging, production or main. This development-only release policy remains
active for later implementation phases unless explicitly changed by the user.

Every meaningful batch or completed phase follows. A small microtask PASS remains local evidence and does not trigger release mechanics:

1. accumulate related microtasks until a microphase/meaningful batch boundary; run its applicable Gate and require `PASS`;
2. inspect `git diff` and accidental files;
3. update roadmap status/evidence;
4. create one coherent batch or phase-close commit on development;
5. push development and wait for development CI PASS;
6. record `PHASE`, `DEVELOPMENT_SHA` and `DEVELOPMENT_CI`;
7. do not dispatch staging/production/main promotion unless the user explicitly changes this release override.

No later phase starts while the previous phase is FAIL or BLOCKED. Do not create a commit or push for every trivial microtask. Functional execution is active after the authoring baseline.

## 39. PHASE EXECUTION CONTRACT

The ROADMAP is the sole execution authority for microtasks, Gates and status. Each microphase must record `GIVEN / WHEN / THEN / AND` acceptance criteria, affected surfaces, dependencies, risks, evidence and rollback. A microphase Gate has only `PASS`, `FAIL`, `BLOCKED` or `NOT_APPLICABLE`. `PASS_WITH_GAPS` is informative only at global audit level and never closes a mandatory Gate.

The allowed repository status values are `DONE`, `PARTIAL`, `MISSING`, `NEEDS_VERIFICATION`, `NEEDS_HARDENING` and `BLOCKED`. They describe starting repository reality, not the result of a Gate.

## 40. FINAL RELEASE GATE

The remediation is releasable only when:

- all required phase final Gates are PASS;
- all 18 findings have explicit acceptance evidence or an approved, documented supersession;
- no `DO_NOT_BREAK` invariant is violated;
- unit/integration, lint, build, relevant E2E, accessibility, responsive, i18n and artifact gates pass;
- HTML/DOCX/PDF corpus validates content, semantics and order;
- production read-only smoke is PASS and no real-user mutation occurred, or is `NOT_APPLICABLE` when the active release policy forbids promotion;
- development → staging → production → main promotion evidence is complete, or each deferred environment is explicitly `NOT_APPLICABLE` under the active development-only override;
- SPEC/ROADMAP/documentation and AOS checks are current;
- worktrees and branch heads are synchronized without force push.

The current execution satisfies P0, P1, P2, P3, P4, P5, P6 and P7 final Gates. P4 was verified against an isolated authorized Neon test branch with the current Drizzle schema: semantic DOCX/PDF evidence remained green, the dedicated mobile editor E2E passed at 390px and 430px in ES/EN and light/dark, and the existing 375px responsive regression passed. P5 adds shared retrieval semantics, duplicate-title context, search/sort/status controls and immediate cover/content preview; the shared inventory/quick-switcher and preview E2E passed on the same isolated branch. P6 makes writing primary while preserving expert controls behind an explicit disclosure; its desktop hierarchy, power-user reachability and mobile containment E2E passed. P7 passed lint, 184 Vitest files/1,153 tests, build, export corpus, focused P4/P5/P6 E2E and 375px regression. `IMPLEMENTATION_STARTED = YES`; P3 delivery is fail-closed until `RESEND_API_KEY`, `AUTH_EMAIL_FROM` and `AUTH_APP_URL` are configured. Under the active policy, only `development` receives commits and pushes; staging/production/main promotion and production smoke are `NOT_APPLICABLE`, not claimed as complete. P7 `PASS` means functional readiness on development, not production release.

## 41. SPEC AUTHORING GATE

| Check | Result | Evidence |
| --- | --- | --- |
| `SPEC_EXISTS` | PASS | this file |
| `ROADMAP_EXISTS` | PASS | root roadmap and eight phase detail files |
| `BASELINE_VERIFIED` | PASS | §2; Git/lint/test/build commands |
| `SOURCE_MATRIX_COMPLETE` | PASS | §5; 18 rows |
| `18_FINDINGS_RECONCILED` | PASS | UX-01..UX-18 in SPEC and ROADMAP |
| `PHASES_DEFINED` | PASS | P0–P7 |
| `MICROPHASES_DEFINED` | PASS | 31 execution microphases + 8 final Gates |
| `MICROTASKS_DEFINED` | PASS | 291 numbered microtasks |
| `GATES_DEFINED` | PASS | G0–G20 catalog |
| `DEPENDENCIES_DEFINED` | PASS | roadmap graph and critical path |
| `DO_NOT_BREAK_DEFINED` | PASS | §32 and phase-level contracts |
| `TRACEABILITY_COMPLETE` | PASS | `FINDING_TO_PHASE_MATRIX` and roadmap matrix |
| `TEST_MATRIX_DEFINED` | PASS | §37 and phase checks |
| `PROMOTION_CONTRACT_DEFINED` | PASS | §21 and §38; existing workflows used |
| `ROLLBACK_DEFINED` | PASS | §35 and every phase detail |
| `AOS_REVIEWED` | PASS | §3 and P0-M04 |
| `NO_PRODUCT_CODE_CHANGED_UNINTENTIONALLY` | PASS | product changes are intentional P0–P3 execution; no unrelated product files are included in the current batch |

**SPEC_AUTHORING_GATE: PASS.** This Gate authorized the specification batch. Functional execution completed P0–P7; current release policy authorizes commit/push to `origin/development` only and no promotion beyond `development`.
