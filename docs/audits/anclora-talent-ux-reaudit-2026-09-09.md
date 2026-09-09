# Anclora Talent — UX/UI Product Re-audit

**STATUS: PASS_WITH_GAPS**

Primary deliverable: anclora-talent-ux-reaudit-2026-09-09.html

The report is in English under repository technical-documentation rules; observed interface copy is preserved in its original language.

## Metadata

```json
{
  "DATE": "2026-09-09",
  "STATUS": "PASS_WITH_GAPS",
  "REPOSITORY": "ToniIAPro73/anclora-talent",
  "BRANCH": "development",
  "SKILL_VERSION": "1.5.0 contract/runtime; 1.4.0 manifest/envelope",
  "SKILL_SOURCE_PATH": "/Users/toni/Developer/anclora/anclora-infrastructure/skills/ux-product-experience-review",
  "SKILL_CONTRACT_SHA": "d53718eac916e117d72ec1196a1d6ffc648fe3f842c7db9752fe9903fb7bf12c",
  "PRIMARY_SURFACE": "APPLICATION",
  "SURFACE_MODE_SOURCE": "OVERRIDE",
  "PLATFORM_MODE": "WEB",
  "SECONDARY_SURFACES": [
    "LANDING_PAGE"
  ],
  "DOMAIN_PROFILE": "NONE",
  "OLD_AUDIT_DATE": "2026-09-05",
  "OLD_HEAD": "UNKNOWN",
  "CURRENT_HEAD": "812167aed8fcb49eb0643ceb0caa3e75d175a016",
  "COMMITS_BETWEEN": "UNKNOWN",
  "CANONICAL_FRONTEND_URL": "https://talent.anclora.com",
  "AUDITED_BROWSER_ENVIRONMENTS": [
    "PRODUCTION"
  ],
  "OLD_FINDING_COUNT": 11,
  "CURRENT_FINDING_COUNT": 18,
  "FIXED_SINCE_PREVIOUS": 0,
  "STILL_PRESENT": 11,
  "PARTIALLY_FIXED": 0,
  "REGRESSIONS": 0,
  "NEW_FINDINGS": 7,
  "PRODUCT_UX_FINDINGS": 18,
  "PRODUCT_ACCESS_FINDINGS": 0,
  "ENGINEERING_SUPPORT_FINDINGS": 0,
  "COMPLIANCE_REVIEW_ITEMS": 0,
  "BROWSER_EVIDENCE_COUNT": 90,
  "ARTIFACT_RESULT": "PASS"
}
```

## 00 Index

A new observation of the deployed product, not a reproduction of the September 5 report. Navigate by section; all finding cards and historical rows are rendered in full.

## 01 Executive assessment

STATUS: PASS_WITH_GAPS. Production and the authorized E2E account were available. The observed editorial workflow is functional in parts, but export integrity prevents a confident end-to-end readiness claim. No application code, project content, database configuration or deployment was changed.

The most serious current defect is not the extra preview click: populated chapters disappear from the downloaded HTML and Word artifacts for the audited QA project. PDF generation succeeds but produces raster pages without selectable text. These findings were not established by the historical audit.

All 11 historical issues were observed again. There are 18 current product UX findings: 11 persistent issues and 7 newly established findings. New means newly evidenced here; it does not prove that the defect was introduced after September 5.

The clearest strengths remain a functioning authorized login, a navigable full preview, working project pagination and a responsive live cover canvas on desktop. Preserve those capabilities while addressing document continuity, mobile editing and project retrieval.

| Executive lens | Evidence-grounded answer |
| --- | --- |
| Biggest user friction | UX-12: exported HTML/Word omit existing chapter content. |
| Simplification opportunity | UX-04: one retrieval model for 57 projects; preserve a quick switcher if its purpose is distinct. |
| Cognitive load | UX-15: optional publication/composition controls dominate the first editor stage. |
| Quick win | UX-07: name chapter actions; UX-06: enlarge password hit targets. |
| Structural opportunity | UX-12/13: restore semantic document continuity through export. |
| Premium / viewport opportunity | UX-16/14: bring the document forward and adapt physical mobile layout independently of export format. |

## 02 What changed since the previous audit

No real improvement among OLD-F01–OLD-F11 was verified. Their current status is STILL_PRESENT. No historical finding is labeled REGRESSED: the available historical states do not establish a fixed intermediate state followed by deterioration.

The local development HEAD has not moved since September 2 according to Git history/reflog, but the historical PDF contains no audited SHA. OLD_HEAD and COMMITS_BETWEEN are therefore UNKNOWN. Zero local commits after September 5 is contextual evidence, not proof of production immutability.

Newly measured concerns: missing manuscript in HTML/Word (UX-12), image-only export semantics (UX-13), clipped mobile editor (UX-14), initial editor decision load (UX-15), workspace position (UX-16), mixed-language operational copy (UX-17) and project-modal keyboard lifecycle (UX-18). The old executive summary already discussed decision load; UX-15 is newly formalized, not a newly discovered historical symptom.

| Delta field | Result |
| --- | --- |
| Old / current date | 2026-09-05 / 2026-09-09 |
| Old / current HEAD | UNKNOWN / 812167aed8fcb49eb0643ceb0caa3e75d175a016 |
| Commits between audited heads | UNKNOWN |
| Local commits after old audit date | 0 in fetched development history |
| Finding count | 11 historical / 18 current |
| Maximum severity | CRITICAL / CRITICAL; different leading finding |
| Status | PASS_WITH_GAPS / PASS_WITH_GAPS |
| Fixed / still present / partial / regressed | 0 / 11 / 0 / 0 |
| No longer applicable / not retested / cannot retest | 0 / 0 / 0 |
| Newly formalized findings | 7; one (UX-15) was already a historical executive concern |

## 03 Methodology delta

CURRENT_INSTALLED_SKILL_WINS. The installed SKILL.md and Python module identify v1.5.0; skill.yaml and runtime result envelope still report v1.4.0. This report applies the current installed behavior and documents the package inconsistency rather than silently rewriting metadata. Release notes describe v1.5.0 as a working, not committed, version.

The recovered historical PDF does not specify a skill version. A neighboring v1.1.0 static JSON contains only three findings and is not the eleven-finding browser baseline. Do not assign its version or scorecard to the PDF.

Surface separation, browser-environment provenance, finding scopes, zero-coverage tool semantics and NOT_EVALUATED/NOT_APPLICABLE calibration change how the evidence is organized. They do not establish product changes. OLD-F01 is recalibrated from CRITICAL to HIGH because full preview remains reachable; OLD-F07 is HIGH here because essential row actions remain unavailable by name. Neither severity change is a product improvement or regression.

MEDIA is accepted as an arbitrary input string, but no dedicated media schema, criteria or runtime branch exists. DOMAIN_PROFILE=NONE. No contextual scorecard extensions were invented.

The current schema contract is reproduced below. SKILL_CONTRACT_SHA is SHA-256 of the installed SKILL.md; hashes for manifest, runtime and release notes are retained in skill-hashes.json. docs/VALIDATION.md does not exist in this package. Routing, APPLICATION, browser provenance, finding-scope and composed-coverage tests were read; the skill test suite was not rerun against temporary repositories.

| Method change | Practical consequence |
| --- | --- |
| SURFACE_AWARE_ARCHITECTURE | Primary application profile and separately evaluated public landing. |
| BROWSER_ENVIRONMENT_PROVENANCE | Production observations distinguished from local inspection of downloaded artifacts. |
| FINDING_SCOPE | All 18 material findings are PRODUCT_UX; tooling and governance notes do not lower UX grades. |
| TOOL_COMPATIBILITY_GAPS | i18n sees zero JSON locale files; visual regression adapter executes no browser comparison. |
| ADAPTIVE_SCORECARDS | Only relevant dimensions scored; untested completion stays NOT_EVALUATED. |
| STRICTER_EVIDENCE | Download success is separated from manuscript integrity. No numerical old/new score comparison. |

```json
{
  "SURFACE_MODE_SCHEMA": [
    "APPLICATION",
    "LANDING_PAGE",
    "MARKETING_SITE",
    "PUBLIC_PRODUCT_SITE",
    "DASHBOARD",
    "PORTAL",
    "ECOMMERCE"
  ],
  "PLATFORM_MODE_SCHEMA": [
    "WEB",
    "MOBILE",
    "DESKTOP",
    "PWA",
    "CROSS_PLATFORM"
  ],
  "APPLICATION_PROFILE_SCHEMA": [
    "Application Shell",
    "Viewport Economy",
    "Primary Workspace",
    "Workflow Efficiency",
    "Context Management"
  ],
  "SECONDARY_SURFACE_SCHEMA": "List of valid surface modes excluding primary; duplicates removed",
  "EVIDENCE_MODEL": [
    "MEASURED_BROWSER",
    "MEASURED_CODE",
    "DECLARED_CONTRACT",
    "DECLARED_DOCS",
    "INFERRED",
    "UNKNOWN"
  ],
  "FINDING_SCOPE_SCHEMA": [
    "PRODUCT_UX",
    "PRODUCT_ACCESS",
    "ENGINEERING_SUPPORT",
    "EXTERNAL_INFRASTRUCTURE",
    "COMPLIANCE_REVIEW"
  ],
  "BROWSER_ENVIRONMENT_SCHEMA": [
    "PRODUCTION",
    "STAGING",
    "PREVIEW",
    "LOCAL_BUILD",
    "UNKNOWN"
  ],
  "SCORECARD_SCHEMA": [
    "EXCELLENT",
    "GOOD",
    "FAIR",
    "POOR",
    "CRITICAL",
    "NOT_EVALUATED",
    "NOT_APPLICABLE"
  ],
  "FINDING_SCHEMA": [
    "id",
    "title",
    "category",
    "finding_scope",
    "surface",
    "journey",
    "screen",
    "user_type",
    "task_criticality",
    "friction_type",
    "severity",
    "priority",
    "evidence_level",
    "browser_environment",
    "evidence",
    "frequency",
    "current_behavior",
    "root_ux_cause",
    "why_it_matters",
    "user_impact",
    "recommended_change",
    "why_this_change",
    "expected_benefit",
    "effort",
    "risk",
    "quick_win",
    "dependencies",
    "do_not_break",
    "historical_id",
    "change_class",
    "implementation_guidance"
  ],
  "COMPOSED_SKILL_COVERAGE_RULES": "COMPLETED != COVERED; executed=false or zero relevant items is TOOL_COMPATIBILITY_GAP unless not applicable",
  "LEGAL_COMPLIANCE_GUARD": "LEGAL_REVIEW_REQUIRED unless authorized qualified compliance evidence supports a legal determination",
  "MEDIA_PROFILE": "No implemented dedicated profile; NONE selected"
}
```

## 04 Surface classification

PRIMARY_SURFACE=APPLICATION; SURFACE_MODE=APPLICATION; SURFACE_MODE_SOURCE=OVERRIDE; confidence HIGH. PLATFORM_MODE=WEB; PLATFORM_MODE_SOURCE=OVERRIDE. SECONDARY_SURFACES=[LANDING_PAGE]. The public root contains acquisition copy and sign-up/sign-in CTAs and is material to discovery.

AUTO_DETECT_SURFACE ran. The static engine inferred DASHBOARD from auth routes plus table/filter signals. This is a non-blocking SURFACE_MODE_MISMATCH_WARNING: the observed primary task is editorial authoring, not KPI monitoring. The override remains authoritative. A /dashboard route name does not define the product model.

Application shell, primary workspace, viewport economy, workflow efficiency and context management are ACTIVE. Hero, offer, proof and conversion criteria are ACTIVE only for the secondary landing. No blended scorecard is used.

## 05 Current product model

Talent is a paused premium editorial web application: import or start a project, structure chapters, edit content, configure document/brand rules, design covers, preview and export. PAUSED is declared by README and AOS adoption; it does not lower the quality bar.

Next.js App Router, React, TipTap, custom credential/OAuth auth, Neon/Drizzle and Vercel Blob are code/document context. No infrastructure from another Anclora product was assumed. Production is reachable at talent.anclora.com; staging/preview/local-build URLs and deployed SHA are UNKNOWN.

The current repository exposes additional panels for snapshots, document health, collaboration, co-authoring and publishing channels. Their presence does not establish fully operational capabilities in production. No distinct administrative user role was proven.

| Evidence class | Capability boundary |
| --- | --- |
| Confirmed rendered | Landing; credential login; enabled OAuth entry buttons; dashboard/new-project form; 57-project inventory; chapter rows/editor; brand/rules panels; cover/back cover; full preview; export controls; ES/EN and light/dark. |
| Confirmed artifacts | HTML, PDF and DOCX downloads; important integrity/semantic failures documented. |
| Code/document only | Import processing, create/save/reorder/delete, snapshot restoration, collaboration, publishing integrations, OAuth completion. |
| Absent in inventory UI | Search, filters, user-controlled sort; modal has automatic updatedAt descending order. |
| Versioning | History panel and Save version exist; no version created/restored in this audit. |
| EPUB | An API route exists; not a verified user-facing journey and not counted as an export capability tested here. |

## 06 Promise versus observed experience

The landing promises a platform where document, preview and cover stop competing. The code and SDD require one canonical document source for editor, composition and exports.

The experience partly fulfills that promise: a persisted project can be opened, its chapters read, its cover seen in full preview and exports requested. It does not fulfill it reliably end to end: HTML/Word lose chapter content in the tested state, and initial preview hides the document behind an extra action.

Cover title and project/document title can differ; the audited project card identifies E4 Libro luego marca QA while the document is Éxito sin compañía. This is not automatically a defect: project identity and publication metadata have distinct purposes. Context needs to make that distinction clear.

| Promise segment | Current evidence |
| --- | --- |
| IMPORT → STRUCTURE | Declared/code supported; import persistence not executed. |
| EDIT → DESIGN | Existing content and live unsaved cover changes observed; saves excluded. |
| DESIGN → PREVIEW | Persisted cover appearance matches the observed full-preview cover; pixel-level fidelity not certified. |
| PREVIEW → EXPORT | Broken for tested HTML/Word manuscript content; PDF visual output exists but is rasterized. |

## 07 User types

| Persona | Primary goal | Entry | Frequent tasks | Information needs | Primary workspace | Next action / recovery |
| --- | --- | --- | --- | --- | --- | --- |
| ANONYMOUS_VISITOR | Understand the offer | / | Landing → auth | Offer, formats and next action | Public landing | Create account / sign in; recovery if access fails |
| FIRST_TIME_USER / NEW_AUTHENTICATED_USER | Begin an editorial project | /dashboard | Title, template, optional source | Required versus optional choices | Create form | Create → chapters; creation not submitted |
| AUTHOR / EDITOR | Write and shape a document | Project editor | Chapters, formatting, cover, preview, export | Project identity, current stage, save state | Chapter editor | Continue content or review output |
| RETURNING_AUTHOR / USER_WITH_MANY_PROJECTS | Find and resume the right document | My projects | Identify, open, continue, export | Recency, title distinction and query | Project inventory | Open selected project; missing search |
| POWER_USER | Control composition efficiently | Editor rules / chapter toolbar | Rules, page navigation, document format | Defaults, shortcuts, content integrity | Editor + composition controls | Apply deliberate changes; persistence not tested |

## 08 Task inventory

| ID | Task | Journey class | Criticality | Coverage |
| --- | --- | --- | --- | --- |
| J1 | Landing → sign-up | FIRST_TIME_JOURNEY | OCCASIONAL | COVERED |
| J2 | Registration → first login | FIRST_TIME_JOURNEY | OCCASIONAL | SAFETY_BLOCKED / inspection only |
| J3 | Credential sign-in | SECONDARY_JOURNEY | OCCASIONAL | COVERED |
| J4 | Password recovery | RECOVERY_JOURNEY | OCCASIONAL | COVERED |
| J5 | First project | FIRST_TIME_JOURNEY | CORE | SAFETY_BLOCKED / inspection only |
| J6 | Document import | FIRST_TIME_JOURNEY | CORE | SAFETY_BLOCKED / inspection only |
| J7 | Template selection | FIRST_TIME_JOURNEY | CORE | COVERED |
| J8 | Project setup | FIRST_TIME_JOURNEY | CORE | PARTIAL |
| J9 | Chapter structure | PRIMARY_JOURNEY | CORE | COVERED |
| J10 | Edit chapter | PRIMARY_JOURNEY | CORE | PARTIAL |
| J11 | Reorder chapters | POWER_USER_JOURNEY | CORE | SAFETY_BLOCKED / inspection only |
| J12 | Brand profile | PRIMARY_JOURNEY | CORE | SAFETY_BLOCKED / inspection only |
| J13 | Typography rules | POWER_USER_JOURNEY | CORE | SAFETY_BLOCKED / inspection only |
| J14 | Cover Studio | PRIMARY_JOURNEY | CORE | PARTIAL |
| J15 | Back cover | PRIMARY_JOURNEY | CORE | PARTIAL |
| J16 | Inline preview | PRIMARY_JOURNEY | CORE | COVERED |
| J17 | Full preview | PRIMARY_JOURNEY | CORE | COVERED |
| J18 | Export HTML | PRIMARY_JOURNEY | CORE | COVERED |
| J19 | Export PDF | PRIMARY_JOURNEY | CORE | PARTIAL |
| J20 | Export DOCX | PRIMARY_JOURNEY | CORE | COVERED |
| J21 | My projects | RETURNING_USER_JOURNEY | CORE | COVERED |
| J22 | Search project | RETURNING_USER_JOURNEY | CORE | NOT_APPLICABLE — capability absent |
| J23 | Filter projects | RETURNING_USER_JOURNEY | CORE | NOT_APPLICABLE — capability absent |
| J24 | Sort projects | RETURNING_USER_JOURNEY | CORE | COVERED |
| J25 | Open existing project | RETURNING_USER_JOURNEY | CORE | COVERED |
| J26 | Delete project | SECONDARY_JOURNEY | OCCASIONAL | SAFETY_BLOCKED / inspection only |
| J27 | Language change | SECONDARY_JOURNEY | OCCASIONAL | COVERED |
| J28 | Theme change | SECONDARY_JOURNEY | OCCASIONAL | COVERED |
| J29 | Logout | SECONDARY_JOURNEY | OCCASIONAL | SAFETY_BLOCKED / inspection only |
| J30 | Session recovery | RECOVERY_JOURNEY | OCCASIONAL | SAFETY_BLOCKED / inspection only |

## 09 Critical journeys

All 30 requested journey candidates were checked against the current product. Absent search/filter capabilities are recorded as absent, not as executed flows. Safe local UI interactions are distinguished from persisted operations.

The complete per-journey record appears below and in the JSON companion: user, goal, entry, steps, decisions, inputs, context switches, scroll, waits, feedback, recovery, viewport/theme/locale and provenance. Unknown measurements remain explicit.

### J1 Landing → sign-up

```json
{
  "id": "J1",
  "name": "Landing → sign-up",
  "classification": "FIRST_TIME_JOURNEY",
  "task_criticality": "OCCASIONAL",
  "user_type": "ANONYMOUS_VISITOR",
  "goal": "Landing → sign-up",
  "entry_state": "Anonymous public page",
  "route": "/",
  "steps": "Hero CTA reaches sign-up. Public acquisition path observed.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Hero CTA reaches sign-up. Public acquisition path observed.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J2 Registration → first login

```json
{
  "id": "J2",
  "name": "Registration → first login",
  "classification": "FIRST_TIME_JOURNEY",
  "task_criticality": "OCCASIONAL",
  "user_type": "ANONYMOUS_VISITOR",
  "goal": "Registration → first login",
  "entry_state": "Anonymous public page",
  "route": "/sign-up",
  "steps": "Only invalid-password submission tested; generic error and retained fields. Successful account creation excluded by read-only scope.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Only invalid-password submission tested; generic error and retained fields. Successful account creation excluded by read-only scope.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "SAFETY_BLOCKED / inspection only"
}
```

### J3 Credential sign-in

```json
{
  "id": "J3",
  "name": "Credential sign-in",
  "classification": "SECONDARY_JOURNEY",
  "task_criticality": "OCCASIONAL",
  "user_type": "ANONYMOUS_VISITOR",
  "goal": "Credential sign-in",
  "entry_state": "Anonymous public page",
  "route": "/sign-in",
  "steps": "Authorized E2E account reaches dashboard. Invalid synthetic credentials show an alert. No secrets persisted.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Authorized E2E account reaches dashboard. Invalid synthetic credentials show an alert. No secrets persisted.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J4 Password recovery

```json
{
  "id": "J4",
  "name": "Password recovery",
  "classification": "RECOVERY_JOURNEY",
  "task_criticality": "OCCASIONAL",
  "user_type": "ANONYMOUS_VISITOR",
  "goal": "Password recovery",
  "entry_state": "Anonymous public page",
  "route": "/sign-in",
  "steps": "No reachable recovery control; unavailable by design.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "No reachable recovery control; unavailable by design.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J5 First project

```json
{
  "id": "J5",
  "name": "First project",
  "classification": "FIRST_TIME_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "First project",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/dashboard",
  "steps": "Title, default book template, optional manuscript, structure reference and brand PDF inspected; final creation not submitted.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Title, default book template, optional manuscript, structure reference and brand PDF inspected; final creation not submitted.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "SAFETY_BLOCKED / inspection only"
}
```

### J6 Document import

```json
{
  "id": "J6",
  "name": "Document import",
  "classification": "FIRST_TIME_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Document import",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/dashboard",
  "steps": "File choices and 50MB guidance inspected; upload/processing not submitted.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "File choices and 50MB guidance inspected; upload/processing not submitted.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "SAFETY_BLOCKED / inspection only"
}
```

### J7 Template selection

```json
{
  "id": "J7",
  "name": "Template selection",
  "classification": "FIRST_TIME_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Template selection",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/dashboard",
  "steps": "Five template options visible. Default book selected; structure/reference optional. No project creation.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Five template options visible. Default book selected; structure/reference optional. No project creation.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J8 Project setup

```json
{
  "id": "J8",
  "name": "Project setup",
  "classification": "FIRST_TIME_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Project setup",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/editor",
  "steps": "Existing project setup and defaults inspected; no save.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Existing project setup and defaults inspected; no save.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "PARTIAL"
}
```

### J9 Chapter structure

```json
{
  "id": "J9",
  "name": "Chapter structure",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Chapter structure",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/editor",
  "steps": "Six chapter rows, word/page estimates and boundary controls inspected.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Six chapter rows, word/page estimates and boundary controls inspected.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J10 Edit chapter

```json
{
  "id": "J10",
  "name": "Edit chapter",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Edit chapter",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/editor",
  "steps": "Chapter modal, pagination, toolbars and device controls opened; no content save.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Chapter modal, pagination, toolbars and device controls opened; no content save.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "PARTIAL"
}
```

### J11 Reorder chapters

```json
{
  "id": "J11",
  "name": "Reorder chapters",
  "classification": "POWER_USER_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Reorder chapters",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/editor",
  "steps": "Move controls inspected, unnamed; no reorder mutation.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Move controls inspected, unnamed; no reorder mutation.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "SAFETY_BLOCKED / inspection only"
}
```

### J12 Brand profile

```json
{
  "id": "J12",
  "name": "Brand profile",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Brand profile",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/editor",
  "steps": "Profile selector and PDF extraction entry inspected; no upload or profile creation.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Profile selector and PDF extraction entry inspected; no upload or profile creation.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "SAFETY_BLOCKED / inspection only"
}
```

### J13 Typography rules

```json
{
  "id": "J13",
  "name": "Typography rules",
  "classification": "POWER_USER_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Typography rules",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/editor",
  "steps": "15 rule controls and preset actions inspected; no persistence.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "15 rule controls and preset actions inspected; no persistence.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "SAFETY_BLOCKED / inspection only"
}
```

### J14 Cover Studio

```json
{
  "id": "J14",
  "name": "Cover Studio",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Cover Studio",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/cover",
  "steps": "Persisted cover inspected; local template and title changes update canvas, then discarded by navigation.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Persisted cover inspected; local template and title changes update canvas, then discarded by navigation.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "PARTIAL"
}
```

### J15 Back cover

```json
{
  "id": "J15",
  "name": "Back cover",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Back cover",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/back-cover",
  "steps": "Existing back-cover view and controls inspected; no save.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Existing back-cover view and controls inspected; no save.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "PARTIAL"
}
```

### J16 Inline preview

```json
{
  "id": "J16",
  "name": "Inline preview",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Inline preview",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/preview",
  "steps": "No useful document shown at entry; one modal-launch action required.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "No useful document shown at entry; one modal-launch action required.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J17 Full preview

```json
{
  "id": "J17",
  "name": "Full preview",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Full preview",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/preview",
  "steps": "Cover and content pages rendered; next page works; 43 pages in original desktop preferences.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Cover and content pages rendered; next page works; 43 pages in original desktop preferences.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J18 Export HTML

```json
{
  "id": "J18",
  "name": "Export HTML",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Export HTML",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/preview",
  "steps": "File downloads, but content is replaced by empty placeholder; 3 pages.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "File downloads, but content is replaced by empty placeholder; 3 pages.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J19 Export PDF

```json
{
  "id": "J19",
  "name": "Export PDF",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Export PDF",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/preview",
  "steps": "Client PDF download succeeds; 27 image-only pages. Full page fidelity unproven.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Client PDF download succeeds; 27 image-only pages. Full page fidelity unproven.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "PARTIAL"
}
```

### J20 Export DOCX

```json
{
  "id": "J20",
  "name": "Export DOCX",
  "classification": "PRIMARY_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Export DOCX",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/preview",
  "steps": "File downloads; valid ZIP, 3 image-only pages and no editable text; missing manuscript.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "File downloads; valid ZIP, 3 image-only pages and no editable text; missing manuscript.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J21 My projects

```json
{
  "id": "J21",
  "name": "My projects",
  "classification": "RETURNING_USER_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "My projects",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects",
  "steps": "57 projects, 25 modal rows per page, 3 pages; Next tested. Standalone page lists all 57 cards.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "57 projects, 25 modal rows per page, 3 pages; Next tested. Standalone page lists all 57 cards.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J22 Search project

```json
{
  "id": "J22",
  "name": "Search project",
  "classification": "RETURNING_USER_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Search project",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects",
  "steps": "No search control found in either inventory. Capability absent in current UI/code.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "No search control found in either inventory. Capability absent in current UI/code.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "NOT_APPLICABLE — capability absent"
}
```

### J23 Filter projects

```json
{
  "id": "J23",
  "name": "Filter projects",
  "classification": "RETURNING_USER_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Filter projects",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects",
  "steps": "No filter control found. Capability absent.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "No filter control found. Capability absent.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "NOT_APPLICABLE — capability absent"
}
```

### J24 Sort projects

```json
{
  "id": "J24",
  "name": "Sort projects",
  "classification": "RETURNING_USER_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Sort projects",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects",
  "steps": "No user sort control; modal automatically sorts updatedAt descending.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "No user sort control; modal automatically sorts updatedAt descending.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J25 Open existing project

```json
{
  "id": "J25",
  "name": "Open existing project",
  "classification": "RETURNING_USER_JOURNEY",
  "task_criticality": "CORE",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Open existing project",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects",
  "steps": "Existing QA project opened from standalone card.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Existing QA project opened from standalone card.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J26 Delete project

```json
{
  "id": "J26",
  "name": "Delete project",
  "classification": "SECONDARY_JOURNEY",
  "task_criticality": "OCCASIONAL",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Delete project",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects",
  "steps": "Delete affordances and safeguards inspected in code only; never executed.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Delete affordances and safeguards inspected in code only; never executed.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "SAFETY_BLOCKED / inspection only"
}
```

### J27 Language change

```json
{
  "id": "J27",
  "name": "Language change",
  "classification": "SECONDARY_JOURNEY",
  "task_criticality": "OCCASIONAL",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Language change",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/editor",
  "steps": "Shell locale switch works; English importer/template/PDF strings incomplete.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Shell locale switch works; English importer/template/PDF strings incomplete.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J28 Theme change

```json
{
  "id": "J28",
  "name": "Theme change",
  "classification": "SECONDARY_JOURNEY",
  "task_criticality": "OCCASIONAL",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Theme change",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/editor",
  "steps": "Shell theme switch works; representative public/app states in both themes.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Shell theme switch works; representative public/app states in both themes.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "COVERED"
}
```

### J29 Logout

```json
{
  "id": "J29",
  "name": "Logout",
  "classification": "SECONDARY_JOURNEY",
  "task_criticality": "OCCASIONAL",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Logout",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/projects/[id]/editor",
  "steps": "Not executed: ending the authorized session is unnecessary and involves a server mutation under the guard.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "Not executed: ending the authorized session is unnecessary and involves a server mutation under the guard.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "SAFETY_BLOCKED / inspection only"
}
```

### J30 Session recovery

```json
{
  "id": "J30",
  "name": "Session recovery",
  "classification": "RECOVERY_JOURNEY",
  "task_criticality": "OCCASIONAL",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "goal": "Session recovery",
  "entry_state": "Authorized existing test account and QA project",
  "route": "/sign-in",
  "steps": "No safe expired-session fixture; not simulated.",
  "decisions": "Not counted end-to-end; only safe local choices exercised",
  "inputs": "Synthetic invalid auth input / local unsaved cover title where noted; otherwise none submitted",
  "context_switches": "Route → stage → modal as described; no fabricated aggregate",
  "scroll": "Captured at specified viewport; long forms/lists require vertical scroll",
  "wait_states": "Auth and PDF pending observed; stage persistence intentionally held by audit guard",
  "loading": "Observed for auth/PDF; not generalized",
  "disabled": "Auth/PDF pending; chapter boundaries; future steps",
  "success": "Partial: see steps",
  "error": "Auth validation and HTML/DOCX content mismatch observed; guard-induced errors excluded from findings",
  "recovery": "No destructive/persistent recovery executed",
  "success_state": "No safe expired-session fixture; not simulated.",
  "viewport": "See browser evidence index; all requested sizes covered on public/list/setup, editor varied separately",
  "theme": "dark/light representative states",
  "locale": "es/en representative states",
  "keyboard_notes": "Modal Escape/focus failure directly tested; full accessibility coverage incomplete",
  "screenshot_reference": "See evidence index and journey-specific finding evidence",
  "browser_environment": "PRODUCTION",
  "coverage": "SAFETY_BLOCKED / inspection only"
}
```

## 10 Screen map

| Screen | Purpose | Primary action | Secondary / utility | Destructive |
| --- | --- | --- | --- | --- |
| / | Explain the offer | Create account | Sign in; legal links | None |
| /sign-in | Authenticate | Sign in | Show password; providers | None |
| /sign-up | Register | Create account | Sign in; legal links | None |
| /dashboard / /projects/new | Start a project | Create and open editor | Template/import/brand/reference | None |
| /projects / modal | Retrieve projects | Open editor | Preview; pagination in modal | Delete |
| Editor Content stage | Configure current document | Continue to chapters / save group | Rules, metadata, health, history | None executed |
| Chapter editor | Write/read a chapter | Edit content | Format, zoom, page/chapter navigation | Remove content; not executed |
| Cover / back cover | Design publication surfaces | Save final design | Template, fields, image, advanced editor | No destructive flow executed |
| Preview | Review output | Open full preview | HTML/PDF/Word; cover/editor destinations | None |

## 11 Experience map

| Entry | Goal | Action | Response | Friction | Result | Recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Landing | Understand value | Create account | Three-field form | Recovery error not actionable | Account creation not attempted | Field-level guidance needed |
| Returning author | Resume one of 57 | Open My projects | 25-row page | No query/filter | Manual scan and open | Retain query/recency context |
| Editor | Write chapter | Next stage → edit chapter | Full-screen editor | Early settings; mobile desktop spread | Readable desktop; clipped mobile state | Fit physical editor viewport |
| Preview | Inspect manuscript | Open preview | Launcher only | Extra discovery action | Full preview works after click | Immediate useful first render |
| Export | Obtain deliverable | HTML/Word download | File returned | Content placeholder instead of chapters | Invalid deliverable | Fail loudly and preserve source |

## 12 First project and onboarding

The creation form has one mandatory typed field: project title. Book is selected by default. The other major decisions are template choice, optional manuscript, optional structure reference and optional brand manual. It is inaccurate to say a user must configure 15 typographic rules before creating a project.

The first editor stage is the actual early-complexity problem. Seven text/metadata inputs, fifteen rule controls, brand selection and several specialist panels precede the chapter workspace. These are defaulted and can be bypassed with Next, but the hierarchy makes specialist configuration prominent.

The coach mark is dismissible; this was observed locally. Progressive disclosure should preserve defaults and explicit specialist access. Back/data-preservation across a successfully saved new project was not tested because creation and saves are excluded.

Evidence screenshot: evidence/anclora-talent-2026-09-09/new-project-1440x900

Evidence screenshot: evidence/anclora-talent-2026-09-09/editor-setup

## 13 Project management at scale

PROJECT_COUNT=57. The modal renders 25 rows, reports three pages, and Next changes the page. At 1440×900 approximately seven complete rows are visible before its internal scroll area; the other rows are present below. The standalone route renders 57 cards with repeated titles and long vertical scanning.

The modal sorts by updatedAt descending in code; there is no visible sort selector. Its dates help, but no query, status filter or duplicate-title disambiguation workflow was found. The page and modal need not be identical: a quick switcher could be justified, provided both share retrieval semantics.

Current-project identity and repeat navigation remain weaker than a continuous document workspace. No project was deleted, renamed or created to manipulate the inventory.

Evidence screenshot: evidence/anclora-talent-2026-09-09/projects-modal

Evidence screenshot: evidence/anclora-talent-2026-09-09/projects-page

## 14 Editorial workspace

The primary workspace changes from setup form to chapter structure, full-screen editor, cover canvas and preview. The same project is carried through routes, but a nine-step sequence and large stage/progress surfaces create a wizard-like experience.

Moving between stages attempts to persist workflowStep. A network guard held write requests before they reached the server. The initial abort variant produced an audit-induced error boundary, which is excluded from product findings; later held requests permitted local inspection. Save feedback in those guarded states is not production completion evidence.

No persisted edits were made. The cover title/template changes were local only and were discarded by route navigation; reopening the cover showed its original content.

Evidence screenshot: evidence/anclora-talent-2026-09-09/chapters-desktop

## 15 Chapter management

The audited QA project contains six populated chapters. Rows communicate order, title, word count and estimated page counts for device formats. Edit is named; move and delete controls are not. First-up and last-down boundaries are disabled.

Create/import/reorder/delete entry points are present. Their persistence, confirmation and undo behavior were inspected only in code or left unexecuted. The audit does not claim a safe delete or successful reorder.

Long titles occur in real rows. Their scannability is more useful evidence than a generic claim that dense rows are bad.

## 16 TipTap editor

The chapter opens in a full-screen editor with page/chapter navigation, zoom, device views, fonts, size, color, margins, bold/italic/strike, alignment, headings H1–H6, lists, image insertion, page breaks and undo/redo controls. Names exist for many toolbar actions. No formatting save was executed.

Desktop content receives most of the viewport below roughly 200px of editor chrome. At 390px, controls wrap to roughly 540px and the content remains in a desktop spread, clipping both text and context. Physical viewport fitting and publication format must be distinct concepts.

The modal wrapper is generic div markup; a full focus/keyboard audit of this editor remains incomplete. No claim of accessibility pass is made from toolbar labels alone.

Evidence screenshot: evidence/anclora-talent-2026-09-09/chapter-editor-desktop

Evidence screenshot: evidence/anclora-talent-2026-09-09/editor-390x844

## 17 Cover Studio

A persisted cover was observed in studio and full preview. Selecting Minimal editorial and typing SYNTHETIC AUDIT changed the local canvas immediately. That confirms a useful live feedback loop, not persistence or full export fidelity.

The cover is the strongest memory anchor: a publication-shaped canvas with typographic control and visible relation to a book. Its potential is diluted by a large generic stage headline and multiple control surfaces before the actual cover.

Advanced editor, image upload, positioning and save controls exist; no image was uploaded and no design saved. Back-cover controls were inspected separately. Template names mix Spanish and English even in English locale.

Evidence screenshot: evidence/anclora-talent-2026-09-09/cover-desktop

Evidence screenshot: evidence/anclora-talent-2026-09-09/cover-unsaved-light

Evidence screenshot: evidence/anclora-talent-2026-09-09/back-cover-en

## 18 Preview experience

FIRST_USEFUL_PREVIEW_ACTIONS=1 additional click after opening the preview route. TIME_TO_USEFUL_PREVIEW=UNKNOWN: the session was not instrumented with reliable start/end timing, so no duration is fabricated.

The full modal renders a cover and subsequent content page with usable page navigation and zoom/device actions. Original desktop preferences yielded 43 pages; preferences and composition mode can affect counts, so a later 27-page PDF is not by itself proof of pagination regression.

Immediate preview usefulness and modal correctness are separate judgments. The modal working does not fix the empty initial preview panel.

Evidence screenshot: evidence/anclora-talent-2026-09-09/preview-inline

Evidence screenshot: evidence/anclora-talent-2026-09-09/preview-full

Evidence screenshot: evidence/anclora-talent-2026-09-09/preview-page2

Evidence screenshot: evidence/anclora-talent-2026-09-09/preview-mobile

## 19 Export experience

HTML and DOCX were downloaded using their actual UI links. The HTML is syntactically complete but contains three export pages with an empty-content placeholder. The Word ZIP is structurally valid, embeds three JPEG pages and contains no text runs. The middle Word image visibly says Contenido aún no disponible.

The PDF was generated by the visible client button. It exposes Exportando PDF... and a disabled state, then downloads a 27-page, approximately 9.7MB PDF. Text extraction yields only form-feed separators; pdfinfo reports no tags. Cover appearance was checked, but every manuscript page has not been certified for fidelity.

Current source offers a plausible explanation for server-only content loss: getDomRuntime catches jsdom load failure and returns null; htmlToBlocks then returns []; composition falls back to empty content. The deployed runtime and dependency packaging were not inspected, so root cause remains an inference supported by code paths.

All artifacts come from the existing authorized QA project. Local rendering of a downloaded artifact is labeled UNKNOWN browser environment; its origin remains PRODUCTION. It is not a LOCAL_BUILD of the application.

| Format | Transport | Integrity evidence | Assessment |
| --- | --- | --- | --- |
| HTML | Download succeeds | 3 pages; empty manuscript placeholder | FAIL: content integrity |
| DOCX | Valid ZIP | 3 page images; no w:t text nodes | FAIL: content and semantic editability |
| PDF | Download succeeds | 27 raster pages; no text/tags | PARTIAL: visual export; semantic access fails |
| Preview → cover | Observed appearance | Original title and blue/gold cover match sample | Representative visual check only |

Evidence screenshot: evidence/anclora-talent-2026-09-09/export-html-empty

Evidence screenshot: evidence/anclora-talent-2026-09-09/docx-page-2

Evidence screenshot: evidence/anclora-talent-2026-09-09/export-pdf-page1

## 20 Authentication and recovery

Credential login succeeded with the authorized E2E account; credentials were read into process memory and never printed or included in artifacts. Invalid synthetic login was also exercised. No real email was sent and no user was created.

Registration validation used a one-character invalid password after checking that server validation returns before any database write. Generic error, pending state and retained inputs were observed. Other error-code mappings are code evidence, not separately submitted browser cases.

Google and GitHub buttons are enabled on sign-in. Provider redirects/consent and OAuth success were not executed, because doing so would involve an external account. Recovery remains unavailable, and session-expired recovery has no safe fixture in this run.

Evidence screenshot: evidence/anclora-talent-2026-09-09/signin-mobile

Evidence screenshot: evidence/anclora-talent-2026-09-09/signup-error

Evidence screenshot: evidence/anclora-talent-2026-09-09/signin-error

## 21 Application shell

| Control | Classification | Observed assessment |
| --- | --- | --- |
| Brand / project identity | CONTEXT / identity | Visible but mobile overlap remains. |
| Dashboard / New / My projects | GLOBAL_NAVIGATION | Button-based destinations; no native link behavior. |
| Language / Theme | GLOBAL_PREFERENCE | Visible, reachable; switching observed. |
| Account | ACCOUNT_ACTION | Account menu exists; no logout mutation executed. |
| Nine-step progress | SCREEN_NAVIGATION | Strong wizard model; future stages initially disabled. |
| Document-data control | UTILITY / CONTEXT_SELECTOR | On-demand metadata is useful, but competes with duplicated setup. |
| Save / export | PRIMARY_CONTENT_ACTION | Contextual action; export success must include integrity. |
| Chapter move/delete | SECONDARY / DESTRUCTIVE | Unnamed controls remain a material accessibility gap. |

## 22 Primary workspace

PRIMARY_WORKSPACE is the chapter document during authoring, cover canvas during design, document pages during review and project inventory during retrieval. The setup form is a means to these workspaces, not the lasting user goal.

The desktop editor modal restores content dominance more effectively than the outer wizard. The cover canvas is coherent and responds immediately. The initial preview panel is the opposite: it allocates space to a launcher rather than the result.

The product currently feels like connected tools with shared data, not yet a consistently continuous studio. Recommendations should improve continuity without flattening specialist composition controls or removing the cover strength.

## 23 Viewport economy

Measurements are CSS-pixel DOM rectangles at the captured state, not performance benchmarks. No arbitrary universal workspace ratio is imposed. The global header is only one contributor; local headings/progress/actions explain much of the lost area.

Persistent control-row/action counts were not measured consistently and remain UNKNOWN. Total DOM controls are not substituted for visible persistent controls.

| Screen | Viewport | Global chrome px | Workspace start Y | Visible workspace | Evidence / limit |
| --- | --- | --- | --- | --- | --- |
| Editor setup | 1440×900 | 72 | 440 | ≈460 | MEASURED_BROWSER editor-setup |
| Chapter structure | 1440×900 | 72 | 440 | ≈460 | MEASURED_BROWSER chapters-desktop |
| Full-screen chapter editor | 1440×900 | 76 modal header | ≈200 | ≈700 | Screenshot + rendered modal geometry |
| Cover | 1440×900 | 72 | Container ≈423; cover ≈601 | ≈299 of actual cover | Screenshot cover-desktop; approximate visual coordinates |
| Mobile chapter editor | 390×844 | ≈195 modal top area | ≈560 content | ≈284; clipped horizontally | editor-390x844 |
| Public/list at 1024 | 1024×768 | Variable | Not aggregated | Scroll width 1037 | Measured shell overflow; not a separate duplicate finding |

## 24 Action hierarchy

Creation has a single submit action; template choices and optional imports are distinct groups. In the editor, multiple Save actions and advanced settings demand interpretation before content. In preview, export controls are exposed before the document itself.

Do not merge content-saving and export into one ambiguous action. Do not convert navigation links into buttons merely to show loading. Destructive chapter actions need names and proportional protection, not greater prominence.

Cover/preview device selectors change publication or viewing configuration; physical responsive layout must not require the user to discover these controls to read content on their phone.

## 25 System states

| State | Observed context | Meaning / next action | Coverage |
| --- | --- | --- | --- |
| FIRST_USE | Create form and coach mark | Purpose and defaults visible | Creation success not tested |
| EMPTY | Source optional / no manuscript in export | Export placeholder misleading for populated document | UX-12 |
| LOADING | Auth and PDF | Pending labels and disabled submit visible | PDF lacks material progress detail; duration not instrumented |
| SAVING / SAVED | Guarded editor stage | Server writes deliberately held | NOT_EVALUATED; never infer success |
| SUCCESS | Login and file transport | Dashboard or download exists | Transport ≠ artifact integrity |
| ERROR | Invalid login/registration | Login alert; generic registration error | UX-03 |
| DISABLED | Chapter boundaries; future steps | Boundary state exposed | Unnamed actions still ambiguous |
| NO_RESULTS | No query/filter capability | Not reachable as a search state | NOT_APPLICABLE |
| IMPORTING / SESSION_EXPIRED | No safe execution/fixture | No behavior claim | SAFETY_BLOCKED / UNKNOWN |

## 26 Error recovery

Registration explains password requirements before submit but does not connect the server rejection to the field. Login has a visible alert and recovers to an enabled submit; password recovery itself has no action.

Export returns a file for an invalid composed result. This is more dangerous to confidence than an explicit error: the user must open and inspect the output to discover missing content. Guard empty composition against populated source and explain retry/recovery.

No import failure, real duplicate-user attempt, destructive operation or expired session was provoked. Guard-induced network errors were instrumentation artifacts and are excluded from product findings.

## 27 Responsive review

All seven requested viewports plus 844×390 landscape were rendered for landing, sign-in, sign-up, dashboard, new project and both project inventory routes. The open chapter editor was inspected at the requested sizes. Cover and preview received representative desktop/mobile checks rather than a full cross-product of every state.

Public pages show no document-level horizontal overflow in measured dark ES states. Auth forms remain reachable in landscape through vertical scroll. Application pages measured 13px document overflow at 1024×768; 390px header overlap and editor clipping remain material.

A lack of page-level overflow is not proof of full responsiveness: mobile project tables have internal scrolling and template cards intentionally scroll horizontally. The report distinguishes deliberate local scrolling from clipped authoring content.

Evidence screenshot: evidence/anclora-talent-2026-09-09/dashboard-390x844

Evidence screenshot: evidence/anclora-talent-2026-09-09/project-modal-390x844

Evidence screenshot: evidence/anclora-talent-2026-09-09/editor-844x390

## 28 Light / dark

Dark is the default. Theme switching was exercised in the authenticated shell; representative public pages were reloaded using the documented local preference cookies for light/English because anonymous pages expose no theme control.

Light and dark maintain recognizable brand accents, rounded controls and hierarchy. Dark project-modal transparency leaves underlying text visible. Light cover canvas remains distinct, but the large title/control chrome still dominates the first viewport.

No full contrast compliance claim is made: axe reported incomplete gradient contrast checks. Focus/error/disabled combinations across every editor tool were not exhaustively measured.

Evidence screenshot: evidence/anclora-talent-2026-09-09/landing-light-en-1440

Evidence screenshot: evidence/anclora-talent-2026-09-09/cover-unsaved-light

## 29 Accessibility

The composed static accessibility audit ran and returned FAIL with source candidates. That execution provides material static coverage, not a WCAG pass. Browser axe checks were run on sign-in, project modal and cover; keyboard focus was tested on the project modal.

Sign-in: two axe violation classes (main landmark, content regions) and incomplete gradient contrast checks. Project modal: color-contrast, heading-order and label candidates; direct keyboard checks prove Escape/focus containment failure. Cover: heading-order, label, main-landmark and region candidates. Not all axe candidates are promoted to standalone findings without task-level validation.

Measured password hit area is about 18px; chapter move/delete names are missing; normal destination-link semantics are absent. Exported raster-only documents extend the accessibility gap beyond the web UI.

## 30 Internationalization

I18N_COMPOSED=FALSE. The canonical check ran but recognized zero JSON locale files. Talent uses src/lib/i18n/messages.ts; the adapter does not parse that storage convention. This is TOOL_COMPATIBILITY_GAP, not a successful parity audit.

The shell switches between ES and EN. Public auth copy localizes; imported manuscript language is intentionally preserved. Operational importer strings, template names and PDF pending copy remain Spanish/mixed. Open Full Preview remains English in Spanish UI.

Raw-key absence is not claimed globally; the observed issue is incomplete localization of actual control/status strings. Tests exist for message parity, but they cannot cover hard-coded strings outside the locale dictionary.

## 31 Premium product surface

Current contract confirms Talent accent #4A9FD8 and DM Sans, dark initial theme and ES default. The visual language is recognizable: navy/neutral surfaces, sky-blue action accents and a publication canvas.

Premium quality is strongest where document/cover content dominates. It weakens when oversized generic stage headings, nested panels and multiple rows of controls precede the work. The issue is spatial priority, not the mere presence of gradients or rounded cards.

The contract contains a legacy human_capital domain label while current SDD/code describe editorial publishing. Treat that as contextual governance inconsistency, not a reason to judge Talent as a recruiting product or invent a MEDIA extension.

## 32 Anti-template and memorability

PRIMARY_MEMORY_ANCHOR: the cover/book canvas. SECONDARY_MEMORY_ANCHOR: the Anclora symbol and sky-blue accent. Product memory comes from shaping a publication; brand memory comes from consistent type and color.

The landing uses familiar hero, benefit cards and proof-like claims. This is not a defect solely because the pattern is common. However, its sample system diagram communicates architecture more strongly than an actual finished publication; this is an opportunity to validate, not an invented conversion finding.

No countdown or scarcity mechanism was observed in the captured landing. No artificial urgency is recommended. Claims such as ready for production must be assessed against export behavior; this report makes no legal determination.

## 33 Historical regression matrix

Each historical finding receives exactly one current status. FIXED requires current behavioral evidence; code presence alone would not suffice. Old severity is preserved separately from current prioritization.

| Old ID / severity | Historical issue | Current status | Current finding / evidence |
| --- | --- | --- | --- |
| OLD-F01 / CRITICAL | El preview principal no mostraba contenido real hasta Open Full Preview | STILL_PRESENT | UX-01 · B-047 / preview-inline; B-046 / preview-full |
| OLD-F02 / HIGH | Recuperación de contraseña aparente pero deshabilitada | STILL_PRESENT | UX-02 · B-080 / signin-mobile; B-071 / signin-1440x900 |
| OLD-F03 / HIGH | Errores de registro genéricos no accionables | STILL_PRESENT | UX-03 · MEASURED_BROWSER: signup-error.png, production /sign-up, 1440x900 dark/es; one-character invalid password, generic error; no account created; B-083 / signup-1440x900 |
| OLD-F04 / HIGH | Dos superficies Mis proyectos sin gestión adecuada a escala | STILL_PRESENT | UX-04 · B-067 / projects-modal; B-068 / projects-page |
| OLD-F05 / HIGH | Landmarks semánticos insuficientes en landing y auth | STILL_PRESENT | UX-05 · B-028 / landing-1440x900; B-080 / signin-mobile |
| OLD-F06 / MEDIUM | Mostrar contraseña: target móvil aproximado de 18×18px | STILL_PRESENT | UX-06 · B-080 / signin-mobile; B-085 / signup-390x844 |
| OLD-F07 / MEDIUM | Acciones icon-only de capítulos sin nombre accesible | STILL_PRESENT | UX-07 · B-003 / chapters-desktop; MEASURED_CODE: src/components/projects/ChapterOrganizer.tsx:151 |
| OLD-F08 / HIGH | Marca solapada con hamburguesa en móvil | STILL_PRESENT | UX-08 · B-016 / dashboard-mobile; B-012 / dashboard-390x844 |
| OLD-F09 / MEDIUM | Navegación autenticada con botones/router.push | STILL_PRESENT | UX-09 · B-068 / projects-page; B-047 / preview-inline |
| OLD-F10 / LOW | Sign-up sin OAuth frente a sign-in | STILL_PRESENT | UX-10 · B-071 / signin-1440x900; B-083 / signup-1440x900 |
| OLD-F11 / LOW | Overlay de Mis proyectos demasiado transparente | STILL_PRESENT | UX-11 · B-067 / projects-modal; MEASURED_CODE: src/components/projects/ProjectsTableModal.tsx:46 + src/app/globals.css |

```json
{
  "old_finding_id": "OLD-F01",
  "old_title": "El preview principal no mostraba contenido real hasta Open Full Preview",
  "old_severity": "CRITICAL",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-01; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-047 / preview-inline",
    "B-046 / preview-full",
    "MEASURED_CODE: src/components/projects/PreviewCanvas.tsx:36"
  ],
  "current_finding_id": "UX-01",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F02",
  "old_title": "Recuperación de contraseña aparente pero deshabilitada",
  "old_severity": "HIGH",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-02; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-080 / signin-mobile",
    "B-071 / signin-1440x900",
    "MEASURED_CODE: src/components/auth/LoginPageContent.tsx:202"
  ],
  "current_finding_id": "UX-02",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F03",
  "old_title": "Errores de registro genéricos no accionables",
  "old_severity": "HIGH",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-03; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "MEASURED_BROWSER: signup-error.png, production /sign-up, 1440x900 dark/es; one-character invalid password, generic error; no account created",
    "B-083 / signup-1440x900",
    "MEASURED_CODE: src/components/auth/RegisterPageContent.tsx:42 + src/app/api/auth/register/route.ts:29"
  ],
  "current_finding_id": "UX-03",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F04",
  "old_title": "Dos superficies Mis proyectos sin gestión adecuada a escala",
  "old_severity": "HIGH",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-04; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-067 / projects-modal",
    "B-068 / projects-page",
    "MEASURED_CODE: src/components/projects/ProjectsTableModal.tsx:13 + src/app/(app)/projects/page.tsx"
  ],
  "current_finding_id": "UX-04",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F05",
  "old_title": "Landmarks semánticos insuficientes en landing y auth",
  "old_severity": "HIGH",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-05; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-028 / landing-1440x900",
    "B-080 / signin-mobile",
    "B-085 / signup-390x844",
    "MEASURED_CODE: src/app/page.tsx + src/components/auth/LoginPageContent.tsx + src/components/auth/RegisterPageContent.tsx"
  ],
  "current_finding_id": "UX-05",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F06",
  "old_title": "Mostrar contraseña: target móvil aproximado de 18×18px",
  "old_severity": "MEDIUM",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-06; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-080 / signin-mobile",
    "B-085 / signup-390x844",
    "MEASURED_CODE: src/components/auth/LoginPageContent.tsx:163 + src/components/auth/RegisterPageContent.tsx:180"
  ],
  "current_finding_id": "UX-06",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F07",
  "old_title": "Acciones icon-only de capítulos sin nombre accesible",
  "old_severity": "MEDIUM",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-07; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-003 / chapters-desktop",
    "MEASURED_CODE: src/components/projects/ChapterOrganizer.tsx:151"
  ],
  "current_finding_id": "UX-07",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F08",
  "old_title": "Marca solapada con hamburguesa en móvil",
  "old_severity": "HIGH",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-08; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-016 / dashboard-mobile",
    "B-012 / dashboard-390x844",
    "MEASURED_CODE: src/components/layout/AppShell.tsx + src/app/globals.css"
  ],
  "current_finding_id": "UX-08",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F09",
  "old_title": "Navegación autenticada con botones/router.push",
  "old_severity": "MEDIUM",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-09; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-068 / projects-page",
    "B-047 / preview-inline",
    "MEASURED_CODE: src/components/ui/NavigatingLink.tsx:53"
  ],
  "current_finding_id": "UX-09",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F10",
  "old_title": "Sign-up sin OAuth frente a sign-in",
  "old_severity": "LOW",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-10; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-071 / signin-1440x900",
    "B-083 / signup-1440x900",
    "MEASURED_CODE: src/components/auth/RegisterPageContent.tsx + src/components/auth/LoginPageContent.tsx"
  ],
  "current_finding_id": "UX-10",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

```json
{
  "old_finding_id": "OLD-F11",
  "old_title": "Overlay de Mis proyectos demasiado transparente",
  "old_severity": "LOW",
  "old_priority": "UNKNOWN — not declared in recovered PDF",
  "old_evidence": "Historical PDF, finding F-11; HISTORICAL_REFERENCE, 2026-09-05",
  "current_status": "STILL_PRESENT",
  "current_evidence": [
    "B-067 / projects-modal",
    "MEASURED_CODE: src/components/projects/ProjectsTableModal.tsx:46 + src/app/globals.css"
  ],
  "current_finding_id": "UX-11",
  "change_since_previous_audit": "Current behavior reproduces the specific historical issue. Severity may be recalibrated; this is not evidence of improvement.",
  "regression_risk": "Retest this journey after remediation; deployed commit linkage remains unknown."
}
```

## 34 Current and historical scorecards

Do not subtract old scores from current scores. The historical schema/version is unverified and its evidence coverage differs. Qualitative grade changes are not a product delta.

APPLICATION scorecard below uses only the active installed profile. LANDING_PAGE is separate. Task Completion remains NOT_EVALUATED for the complete application journey because writes were excluded; the specific export failure is nevertheless proven and prioritized.

Hero/offer/proof/conversion dimensions are NOT_APPLICABLE to the primary application. Application shell/workspace/viewport dimensions are NOT_APPLICABLE to the secondary landing.

| Surface / dimension | Grade | Evidence / limit |
| --- | --- | --- |
| APPLICATION UX · Task Completion | NOT_EVALUATED | Create/save/import completion excluded; export failure UX-12 established. |
| APPLICATION UX · Clarity | FAIR | UX-01/03/15 |
| APPLICATION UX · Efficiency | POOR | UX-04/14 |
| APPLICATION UX · Consistency | FAIR | UX-09/10/17 |
| APPLICATION UX · Feedback | FAIR | Auth/PDF pending works; export false-success UX-12 |
| APPLICATION UX · Error Recovery | POOR | UX-02/03/12 |
| APPLICATION UX · Cognitive Load | FAIR | UX-15 |
| APPLICATION UX · Navigation | FAIR | UX-04/09 |
| APPLICATION UX · Onboarding | FAIR | Creation form default; dense editor setup UX-15 |
| APPLICATION UX · Accessibility | POOR | UX-06/07/13/18; no full WCAG pass |
| APPLICATION UX · Responsive Task Completion | POOR | UX-08/14; all operations not completed |
| APPLICATION UX · Visual Hierarchy | FAIR | UX-16 |
| APPLICATION UX · Premium Quality | FAIR | Working cover strength; document priority inconsistent |
| APPLICATION UX · Application Shell | FAIR | UX-08/09; header 72px, stage chrome larger |
| APPLICATION UX · Viewport Economy | FAIR | UX-14/16 measured states |
| APPLICATION UX · Primary Workspace | FAIR | Good full-screen desktop; poor initial preview/mobile |
| APPLICATION UX · Workflow Efficiency | POOR | UX-04/12/14 |
| APPLICATION UX · Context Management | FAIR | Shared project but route/stage/modal transitions |
| APPLICATION UI · Action Hierarchy | FAIR | Preview result secondary to launcher/export controls |
| APPLICATION UI · Component Coherence | FAIR | Dialog keyboard behavior differs from full preview |
| APPLICATION UI · Content Legibility | FAIR | Desktop clear; mobile spread clipped |
| APPLICATION UI · State Clarity | POOR | Export file transport masks invalid content |
| APPLICATION UI · Theme Coherence | GOOD | Representative light/dark views; all states not covered |
| APPLICATION UI · Data Density | FAIR | Dates and counts useful; 57 projects lack retrieval |
| APPLICATION UI · Modal Ergonomics | POOR | UX-18 and editor mobile |
| APPLICATION UI · Form Ergonomics | FAIR | Good labels/defaults, UX-03/06/15 |
| APPLICATION UI · Spatial Hierarchy | FAIR | UX-16 |
| APPLICATION UI · Premium Visual Quality | FAIR | Cover strength; excess stage chrome |
| APPLICATION UI · Modernity & Product Polish | FAIR | Specific observed interaction gaps, not style fashion |
| LANDING · Task Completion | GOOD | CTA reaches sign-up; account creation scored separately |
| LANDING · Clarity | GOOD | Editorial platform proposition is visible |
| LANDING · Visual Hierarchy | GOOD | Primary CTA and title distinct |
| LANDING · Premium Quality | GOOD | Coherent typography/accent in representative themes |
| LANDING · Accessibility | FAIR | UX-05; incomplete contrast verification |
| LANDING · Responsive | GOOD | Requested viewport matrix; no page overflow observed |
| LANDING · System Feedback | NOT_EVALUATED | No material async landing task |
| LANDING · Error Recovery | NOT_EVALUATED | No landing-specific failure path exercised |
| LANDING · Audience Clarity | FAIR | Broad talent/publication copy; author-specific outcomes less explicit |
| LANDING · Offer Clarity | GOOD | Integrated editorial platform stated |
| LANDING · Value Proposition | GOOD | Clear document/preview/cover relation |
| LANDING · Hero Effectiveness | GOOD | Proposition and CTA visible desktop; mobile scroll required |
| LANDING · CTA Hierarchy | GOOD | Create account primary, sign in secondary |
| LANDING · Proof & Trust | FAIR | Benefit claims rather than independently verified output proof |
| LANDING · Objection Handling | NOT_EVALUATED | No tested objection/conversion study |
| LANDING · Content Sequence | GOOD | Hero → proof strip → steps → showcase → benefits → final CTA |
| LANDING · Conversion Friction | GOOD | Direct route to form; downstream auth flaws separate |
| LANDING · Form Friction | NOT_APPLICABLE | No form on landing |
| LANDING · Mobile Conversion | GOOD | CTA reachable in viewport matrix |
| LANDING · Memorability | FAIR | Brand visible; architectural cards less publication-specific |
| LANDING · Anti-Template Quality | FAIR | Coherent but familiar composition; no arbitrary penalty |

## 35 What works well

| Strength | Current evidence | Do not break |
| --- | --- | --- |
| Credential login | Authorized E2E account reaches dashboard | Preserve pending/alert behavior |
| Project pagination | 25 rows / 3 pages; next works for 57 projects | Preserve while adding retrieval |
| Full preview | Cover and real content are reachable, page navigation works | Reuse for immediate inline preview |
| Cover WYSIWYG | Local title/template changes update the live canvas | Preserve publication-shaped workspace |
| Theme/locale preferences | Shell controls work and are visible | Preserve direct access; finish operational translations |
| Public responsive layout | No document overflow in captured public viewport matrix | Preserve; do not generalize to editor |
| Coach mark | Dismissed locally without changing project content | Keep optional and non-blocking |
| Desktop chapter editor | Content dominates once full-screen modal is open | Preserve while adapting mobile |

## 36 Product UX findings

18 complete finding cards follow. Every card is independently actionable and includes evidence, scope, impact, recommendation, effort/risk, dependencies and acceptance guidance. The first eleven are current observations correlated to historical issues.

### UX-01 Preview entry provides no document until a second action

```json
{
  "id": "UX-01",
  "title": "Preview entry provides no document until a second action",
  "category": "SYSTEM_STATE",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J16 → J17",
  "screen": "/projects/[id]/preview",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "CORE",
  "friction_type": "FEEDBACK_FRICTION",
  "severity": "HIGH",
  "priority": "P1",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-047 / preview-inline",
    "B-046 / preview-full",
    "MEASURED_CODE: src/components/projects/PreviewCanvas.tsx:36"
  ],
  "frequency": "RECURRING",
  "current_behavior": "The initial panel contains only Open Full Preview. One additional click reveals the cover and paginated content.",
  "root_ux_cause": "PreviewCanvas replaces the inline result with a modal launcher.",
  "why_it_matters": "Every review begins with discovery instead of immediate visual confirmation.",
  "user_impact": "Every review begins with discovery instead of immediate visual confirmation.",
  "recommended_change": "Render an immediate cover and first content page using the existing composition result; retain a localized full-screen action.",
  "why_this_change": "PreviewCanvas replaces the inline result with a modal launcher. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "real document content is visible without an extra discovery click",
  "effort": "MEDIUM",
  "risk": "LOW",
  "quick_win": false,
  "dependencies": [
    "src/components/projects/PreviewCanvas.tsx:36"
  ],
  "do_not_break": [
    "Working full preview modal, page navigation and device controls"
  ],
  "historical_id": "OLD-F01",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "/projects/[id]/preview"
    ],
    "affected_components": [
      "src/components/projects/PreviewCanvas.tsx:36"
    ],
    "behavior_before": "The initial panel contains only Open Full Preview. One additional click reveals the cover and paginated content.",
    "behavior_after": "Render an immediate cover and first content page using the existing composition result; retain a localized full-screen action.",
    "acceptance_criteria": [
      "Given /projects/[id]/preview with the same audited state, when the user completes J16 → J17, then real document content is visible without an extra discovery click",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-02 Password recovery is a non-interactive promise

```json
{
  "id": "UX-02",
  "title": "Password recovery is a non-interactive promise",
  "category": "ERROR_RECOVERY",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J4",
  "screen": "/sign-in",
  "user_type": "ANONYMOUS_VISITOR",
  "task_criticality": "CORE",
  "friction_type": "ERROR_RECOVERY_FRICTION",
  "severity": "HIGH",
  "priority": "P1",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-080 / signin-mobile",
    "B-071 / signin-1440x900",
    "MEASURED_CODE: src/components/auth/LoginPageContent.tsx:202"
  ],
  "frequency": "RECURRING",
  "current_behavior": "Forgot-password copy is a span with cursor-not-allowed and a coming-soon title; no recovery route is exposed.",
  "root_ux_cause": "An unavailable capability is styled as an auth link.",
  "why_it_matters": "A returning author who forgets the password has no supported account-recovery path.",
  "user_impact": "A returning author who forgets the password has no supported account-recovery path.",
  "recommended_change": "Provide a complete recovery flow in a separately authorized implementation; until then expose an explicit unavailable state and a truthful next action.",
  "why_this_change": "An unavailable capability is styled as an auth link. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "the recovery state and available next action are unambiguous",
  "effort": "MEDIUM",
  "risk": "MEDIUM",
  "quick_win": false,
  "dependencies": [
    "src/components/auth/LoginPageContent.tsx:202"
  ],
  "do_not_break": [
    "Password masking and current credential login feedback",
    "No account enumeration"
  ],
  "historical_id": "OLD-F02",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "/sign-in"
    ],
    "affected_components": [
      "src/components/auth/LoginPageContent.tsx:202"
    ],
    "behavior_before": "Forgot-password copy is a span with cursor-not-allowed and a coming-soon title; no recovery route is exposed.",
    "behavior_after": "Provide a complete recovery flow in a separately authorized implementation; until then expose an explicit unavailable state and a truthful next action.",
    "acceptance_criteria": [
      "Given /sign-in with the same audited state, when the user completes J4, then the recovery state and available next action are unambiguous",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-03 Registration validation does not explain what to correct

```json
{
  "id": "UX-03",
  "title": "Registration validation does not explain what to correct",
  "category": "ERROR_RECOVERY",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J2",
  "screen": "/sign-up",
  "user_type": "ANONYMOUS_VISITOR",
  "task_criticality": "FREQUENT",
  "friction_type": "ERROR_RECOVERY_FRICTION",
  "severity": "MEDIUM",
  "priority": "P2",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "MEASURED_BROWSER: signup-error.png, production /sign-up, 1440x900 dark/es; one-character invalid password, generic error; no account created",
    "B-083 / signup-1440x900",
    "MEASURED_CODE: src/components/auth/RegisterPageContent.tsx:42 + src/app/api/auth/register/route.ts:29"
  ],
  "frequency": "RECURRING",
  "current_behavior": "A one-character password produces No se pudo crear la cuenta. Inténtalo de nuevo. Fields remain populated and the button recovers from its pending state.",
  "root_ux_cause": "Only EMAIL_IN_USE is mapped; all other server errors share registerError.",
  "why_it_matters": "New users may repeat an invalid submission without learning the correction.",
  "user_impact": "New users may repeat an invalid submission without learning the correction.",
  "recommended_change": "Map INVALID_EMAIL, INVALID_PASSWORD and INVALID_FULL_NAME to field-level localized errors, preserve input and focus the first invalid field.",
  "why_this_change": "Only EMAIL_IN_USE is mapped; all other server errors share registerError. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "the invalid field and correction are stated while valid input is retained",
  "effort": "LOW",
  "risk": "LOW",
  "quick_win": true,
  "dependencies": [
    "src/components/auth/RegisterPageContent.tsx:42 + src/app/api/auth/register/route.ts:29"
  ],
  "do_not_break": [
    "Visible password requirements",
    "Preserved form values and pending submit protection"
  ],
  "historical_id": "OLD-F03",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "/sign-up"
    ],
    "affected_components": [
      "src/components/auth/RegisterPageContent.tsx:42",
      "src/app/api/auth/register/route.ts:29"
    ],
    "behavior_before": "A one-character password produces No se pudo crear la cuenta. Inténtalo de nuevo. Fields remain populated and the button recovers from its pending state.",
    "behavior_after": "Map INVALID_EMAIL, INVALID_PASSWORD and INVALID_FULL_NAME to field-level localized errors, preserve input and focus the first invalid field.",
    "acceptance_criteria": [
      "Given /sign-up with the same audited state, when the user completes J2, then the invalid field and correction are stated while valid input is retained",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-04 57 projects still require manual scanning across two inventories

```json
{
  "id": "UX-04",
  "title": "57 projects still require manual scanning across two inventories",
  "category": "INFORMATION_ARCHITECTURE",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J21–J25",
  "screen": "/dashboard?projects=1 + /projects",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "CORE",
  "friction_type": "NAVIGATION_FRICTION",
  "severity": "HIGH",
  "priority": "P1",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-067 / projects-modal",
    "B-068 / projects-page",
    "MEASURED_CODE: src/components/projects/ProjectsTableModal.tsx:13 + src/app/(app)/projects/page.tsx"
  ],
  "frequency": "RECURRING",
  "current_behavior": "The modal has 25 rows per page and 3 pages; /projects renders 57 cards. Neither exposes search, user-controlled sort or filters. Duplicate titles are common.",
  "root_ux_cause": "Two independently rendered inventories lack a shared retrieval model. The modal does sort automatically by updatedAt, but does not offer a sort control.",
  "why_it_matters": "A returning author cannot reliably identify the right duplicate-titled project in seconds.",
  "user_impact": "A returning author cannot reliably identify the right duplicate-titled project in seconds.",
  "recommended_change": "Establish one canonical project inventory with query, explicit recency sort and useful status filters; let any quick-switch modal reuse that model and preserve query on return.",
  "why_this_change": "Two independently rendered inventories lack a shared retrieval model. The modal does sort automatically by updatedAt, but does not offer a sort control. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "the intended project can be found by title and recency without scanning all 57 entries",
  "effort": "HIGH",
  "risk": "MEDIUM",
  "quick_win": false,
  "dependencies": [
    "src/components/projects/ProjectsTableModal.tsx:13 + src/app/(app)/projects/page.tsx"
  ],
  "do_not_break": [
    "Working pagination and update-date ordering",
    "Row action names and visible dates"
  ],
  "historical_id": "OLD-F04",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "/dashboard?projects=1",
      "/projects"
    ],
    "affected_components": [
      "src/components/projects/ProjectsTableModal.tsx:13",
      "src/app/(app)/projects/page.tsx"
    ],
    "behavior_before": "The modal has 25 rows per page and 3 pages; /projects renders 57 cards. Neither exposes search, user-controlled sort or filters. Duplicate titles are common.",
    "behavior_after": "Establish one canonical project inventory with query, explicit recency sort and useful status filters; let any quick-switch modal reuse that model and preserve query on return.",
    "acceptance_criteria": [
      "Given /dashboard?projects=1 + /projects with the same audited state, when the user completes J21–J25, then the intended project can be found by title and recency without scanning all 57 entries",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-05 Public and auth surfaces lack a main landmark

```json
{
  "id": "UX-05",
  "title": "Public and auth surfaces lack a main landmark",
  "category": "ACCESSIBILITY",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION + LANDING_PAGE",
  "journey": "J1–J3",
  "screen": "/ + /sign-in + /sign-up",
  "user_type": "ANONYMOUS_VISITOR",
  "task_criticality": "FREQUENT",
  "friction_type": "DISCOVERABILITY_FRICTION",
  "severity": "MEDIUM",
  "priority": "P2",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-028 / landing-1440x900",
    "B-080 / signin-mobile",
    "B-085 / signup-390x844",
    "MEASURED_CODE: src/app/page.tsx + src/components/auth/LoginPageContent.tsx + src/components/auth/RegisterPageContent.tsx"
  ],
  "frequency": "RECURRING",
  "current_behavior": "Landing has no main/banner/navigation landmarks. Auth has a header but no main or navigation landmark. Axe confirms main-landmark gaps on sign-in.",
  "root_ux_cause": "Page composition uses generic wrappers without a coherent landmark structure.",
  "why_it_matters": "Assistive-technology users cannot jump directly to the core page task.",
  "user_impact": "Assistive-technology users cannot jump directly to the core page task.",
  "recommended_change": "Add one main landmark per page, an appropriate brand header and labeled navigation for actual navigational groups; do not invent empty landmarks.",
  "why_this_change": "Page composition uses generic wrappers without a coherent landmark structure. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "landmark navigation reaches the main offer or auth form directly",
  "effort": "LOW",
  "risk": "LOW",
  "quick_win": true,
  "dependencies": [
    "src/app/page.tsx + src/components/auth/LoginPageContent.tsx + src/components/auth/RegisterPageContent.tsx"
  ],
  "do_not_break": [
    "Existing form labels",
    "Working public auth links"
  ],
  "historical_id": "OLD-F05",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "/",
      "/sign-in",
      "/sign-up"
    ],
    "affected_components": [
      "src/app/page.tsx",
      "src/components/auth/LoginPageContent.tsx",
      "src/components/auth/RegisterPageContent.tsx"
    ],
    "behavior_before": "Landing has no main/banner/navigation landmarks. Auth has a header but no main or navigation landmark. Axe confirms main-landmark gaps on sign-in.",
    "behavior_after": "Add one main landmark per page, an appropriate brand header and labeled navigation for actual navigational groups; do not invent empty landmarks.",
    "acceptance_criteria": [
      "Given / + /sign-in + /sign-up with the same audited state, when the user completes J1–J3, then landmark navigation reaches the main offer or auth form directly",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-06 Password visibility toggle remains about 18 × 18 px

```json
{
  "id": "UX-06",
  "title": "Password visibility toggle remains about 18 × 18 px",
  "category": "ACCESSIBILITY",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J2–J3",
  "screen": "/sign-in + /sign-up",
  "user_type": "ANONYMOUS_VISITOR",
  "task_criticality": "FREQUENT",
  "friction_type": "DISCOVERABILITY_FRICTION",
  "severity": "MEDIUM",
  "priority": "P2",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-080 / signin-mobile",
    "B-085 / signup-390x844",
    "MEASURED_CODE: src/components/auth/LoginPageContent.tsx:163 + src/components/auth/RegisterPageContent.tsx:180"
  ],
  "frequency": "RECURRING",
  "current_behavior": "The rendered eye button is approximately 18 × 18 CSS pixels on mobile; its accessible name exists.",
  "root_ux_cause": "The icon dimensions define the hit area without padding.",
  "why_it_matters": "Touch users have little tolerance when revealing or hiding a password.",
  "user_impact": "Touch users have little tolerance when revealing or hiding a password.",
  "recommended_change": "Expand the hit area to a comfortable 44 × 44 px where layout permits, preserve the 18px icon and input caret space.",
  "why_this_change": "The icon dimensions define the hit area without padding. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "the visibility action has a reliable hit area and retains its accessible name",
  "effort": "LOW",
  "risk": "LOW",
  "quick_win": true,
  "dependencies": [
    "src/components/auth/LoginPageContent.tsx:163 + src/components/auth/RegisterPageContent.tsx:180"
  ],
  "do_not_break": [
    "Correct show/hide accessible name",
    "Password autocomplete"
  ],
  "historical_id": "OLD-F06",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "/sign-in",
      "/sign-up"
    ],
    "affected_components": [
      "src/components/auth/LoginPageContent.tsx:163",
      "src/components/auth/RegisterPageContent.tsx:180"
    ],
    "behavior_before": "The rendered eye button is approximately 18 × 18 CSS pixels on mobile; its accessible name exists.",
    "behavior_after": "Expand the hit area to a comfortable 44 × 44 px where layout permits, preserve the 18px icon and input caret space.",
    "acceptance_criteria": [
      "Given /sign-in + /sign-up with the same audited state, when the user completes J2–J3, then the visibility action has a reliable hit area and retains its accessible name",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-07 Chapter move and delete controls remain unnamed

```json
{
  "id": "UX-07",
  "title": "Chapter move and delete controls remain unnamed",
  "category": "ACCESSIBILITY",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J9 / J11",
  "screen": "/projects/[id]/editor · Chapters",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "CORE",
  "friction_type": "DISCOVERABILITY_FRICTION",
  "severity": "HIGH",
  "priority": "P1",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-003 / chapters-desktop",
    "MEASURED_CODE: src/components/projects/ChapterOrganizer.tsx:151"
  ],
  "frequency": "RECURRING",
  "current_behavior": "Chapter edit controls are named, but move-up, move-down and delete buttons appear unnamed in the accessibility tree.",
  "root_ux_cause": "Icon-only controls lack accessible names.",
  "why_it_matters": "A screen-reader user cannot identify ordering or deletion actions with confidence.",
  "user_impact": "A screen-reader user cannot identify ordering or deletion actions with confidence.",
  "recommended_change": "Give each action a localized verb plus chapter context; expose tooltips to keyboard focus and keep boundary actions disabled.",
  "why_this_change": "Icon-only controls lack accessible names. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "each chapter action can be identified by verb and target chapter",
  "effort": "LOW",
  "risk": "LOW",
  "quick_win": true,
  "dependencies": [
    "src/components/projects/ChapterOrganizer.tsx:151"
  ],
  "do_not_break": [
    "Named edit action",
    "Disabled first-up/last-down controls"
  ],
  "historical_id": "OLD-F07",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "/projects/[id]/editor · Chapters"
    ],
    "affected_components": [
      "src/components/projects/ChapterOrganizer.tsx:151"
    ],
    "behavior_before": "Chapter edit controls are named, but move-up, move-down and delete buttons appear unnamed in the accessibility tree.",
    "behavior_after": "Give each action a localized verb plus chapter context; expose tooltips to keyboard focus and keep boundary actions disabled.",
    "acceptance_criteria": [
      "Given /projects/[id]/editor · Chapters with the same audited state, when the user completes J9 / J11, then each chapter action can be identified by verb and target chapter",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-08 Mobile brand text overlaps the navigation button

```json
{
  "id": "UX-08",
  "title": "Mobile brand text overlaps the navigation button",
  "category": "RESPONSIVE",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J21 / J27",
  "screen": "Application header at 390 × 844",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "FREQUENT",
  "friction_type": "RESPONSIVE_FRICTION",
  "severity": "MEDIUM",
  "priority": "P2",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-016 / dashboard-mobile",
    "B-012 / dashboard-390x844",
    "MEASURED_CODE: src/components/layout/AppShell.tsx + src/app/globals.css"
  ],
  "frequency": "RECURRING",
  "current_behavior": "The Talent brand text extends beneath the hamburger control at 390px. The controls remain reachable.",
  "root_ux_cause": "Brand minimum content width competes with persistent preference and account controls.",
  "why_it_matters": "Brand identification and navigation lose visual separation at the main mobile entry point.",
  "user_impact": "Brand identification and navigation lose visual separation at the main mobile entry point.",
  "recommended_change": "Constrain the wordmark with min-width:0 and a deliberate compact identity variant; preserve separated navigation and preferences.",
  "why_this_change": "Brand minimum content width competes with persistent preference and account controls. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "brand and navigation hit areas remain visually distinct at 390px",
  "effort": "LOW",
  "risk": "LOW",
  "quick_win": true,
  "dependencies": [
    "src/components/layout/AppShell.tsx + src/app/globals.css"
  ],
  "do_not_break": [
    "Visible language/theme controls",
    "Mobile navigation remains reachable"
  ],
  "historical_id": "OLD-F08",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "Application header at 390 × 844"
    ],
    "affected_components": [
      "src/components/layout/AppShell.tsx",
      "src/app/globals.css"
    ],
    "behavior_before": "The Talent brand text extends beneath the hamburger control at 390px. The controls remain reachable.",
    "behavior_after": "Constrain the wordmark with min-width:0 and a deliberate compact identity variant; preserve separated navigation and preferences.",
    "acceptance_criteria": [
      "Given Application header at 390 × 844 with the same audited state, when the user completes J21 / J27, then brand and navigation hit areas remain visually distinct at 390px",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-09 Navigation destinations are implemented as buttons

```json
{
  "id": "UX-09",
  "title": "Navigation destinations are implemented as buttons",
  "category": "NAVIGATION",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J21 / J25",
  "screen": "Application navigation + project destinations",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "FREQUENT",
  "friction_type": "NAVIGATION_FRICTION",
  "severity": "MEDIUM",
  "priority": "P2",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-068 / projects-page",
    "B-047 / preview-inline",
    "MEASURED_CODE: src/components/ui/NavigatingLink.tsx:53"
  ],
  "frequency": "RECURRING",
  "current_behavior": "Dashboard, New project, My projects and project destinations expose button roles rather than links.",
  "root_ux_cause": "NavigatingLink wraps router.push in a button.",
  "why_it_matters": "Users lose normal open-in-new-tab, copy-link and browser link semantics for recurring destinations.",
  "user_impact": "Users lose normal open-in-new-tab, copy-link and browser link semantics for recurring destinations.",
  "recommended_change": "Use real links for destinations with pending feedback that preserves native browser behavior; retain buttons for state changes.",
  "why_this_change": "NavigatingLink wraps router.push in a button. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "destinations support open-in-new-tab and link discovery without losing pending feedback",
  "effort": "LOW",
  "risk": "LOW",
  "quick_win": true,
  "dependencies": [
    "src/components/ui/NavigatingLink.tsx:53"
  ],
  "do_not_break": [
    "Current loading feedback",
    "Authorization checks on destination routes"
  ],
  "historical_id": "OLD-F09",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "Application navigation",
      "project destinations"
    ],
    "affected_components": [
      "src/components/ui/NavigatingLink.tsx:53"
    ],
    "behavior_before": "Dashboard, New project, My projects and project destinations expose button roles rather than links.",
    "behavior_after": "Use real links for destinations with pending feedback that preserves native browser behavior; retain buttons for state changes.",
    "acceptance_criteria": [
      "Given Application navigation + project destinations with the same audited state, when the user completes J21 / J25, then destinations support open-in-new-tab and link discovery without losing pending feedback",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-10 Social auth entry points are absent from sign-up

```json
{
  "id": "UX-10",
  "title": "Social auth entry points are absent from sign-up",
  "category": "CONSISTENCY",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J1–J3",
  "screen": "/sign-up + /sign-in",
  "user_type": "ANONYMOUS_VISITOR",
  "task_criticality": "FREQUENT",
  "friction_type": "CONSISTENCY_FRICTION",
  "severity": "LOW",
  "priority": "P3",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-071 / signin-1440x900",
    "B-083 / signup-1440x900",
    "MEASURED_CODE: src/components/auth/RegisterPageContent.tsx + src/components/auth/LoginPageContent.tsx"
  ],
  "frequency": "RECURRING",
  "current_behavior": "Google and GitHub are enabled on sign-in; sign-up offers only the three-field credential form. OAuth completion was not attempted.",
  "root_ux_cause": "Auth entry surfaces advertise different available access mechanisms.",
  "why_it_matters": "A first-time social-login user may enter credentials unnecessarily or backtrack to sign-in.",
  "user_impact": "A first-time social-login user may enter credentials unnecessarily or backtrack to sign-in.",
  "recommended_change": "Expose consistent social entry options on registration, with clear semantics for account creation and linking.",
  "why_this_change": "Auth entry surfaces advertise different available access mechanisms. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "a new social-auth user can discover the same supported provider from registration",
  "effort": "MEDIUM",
  "risk": "MEDIUM",
  "quick_win": false,
  "dependencies": [
    "src/components/auth/RegisterPageContent.tsx + src/components/auth/LoginPageContent.tsx"
  ],
  "do_not_break": [
    "Provider availability gating",
    "Existing OAuth security and linking policy"
  ],
  "historical_id": "OLD-F10",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "/sign-up",
      "/sign-in"
    ],
    "affected_components": [
      "src/components/auth/RegisterPageContent.tsx",
      "src/components/auth/LoginPageContent.tsx"
    ],
    "behavior_before": "Google and GitHub are enabled on sign-in; sign-up offers only the three-field credential form. OAuth completion was not attempted.",
    "behavior_after": "Expose consistent social entry options on registration, with clear semantics for account creation and linking.",
    "acceptance_criteria": [
      "Given /sign-up + /sign-in with the same audited state, when the user completes J1–J3, then a new social-auth user can discover the same supported provider from registration",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-11 Project-modal transparency competes with table reading

```json
{
  "id": "UX-11",
  "title": "Project-modal transparency competes with table reading",
  "category": "MODAL_UX",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J21",
  "screen": "/dashboard?projects=1",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "FREQUENT",
  "friction_type": "CONTEXT_SWITCH_FRICTION",
  "severity": "LOW",
  "priority": "P3",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-067 / projects-modal",
    "MEASURED_CODE: src/components/projects/ProjectsTableModal.tsx:46 + src/app/globals.css"
  ],
  "frequency": "RECURRING",
  "current_behavior": "Underlying creation-form and shell text is visible through the modal panel in dark mode.",
  "root_ux_cause": "Backdrop and panel alpha combine to leave background text perceptible.",
  "why_it_matters": "Dense project rows compete with unrelated underlying content.",
  "user_impact": "Dense project rows compete with unrelated underlying content.",
  "recommended_change": "Use a sufficiently opaque modal surface and consistent overlay token in both themes.",
  "why_this_change": "Backdrop and panel alpha combine to leave background text perceptible. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "project rows can be read without background text competing",
  "effort": "LOW",
  "risk": "LOW",
  "quick_win": false,
  "dependencies": [
    "src/components/projects/ProjectsTableModal.tsx:46 + src/app/globals.css"
  ],
  "do_not_break": [
    "Table density",
    "Visible close and pagination actions"
  ],
  "historical_id": "OLD-F11",
  "change_class": "STILL_PRESENT",
  "implementation_guidance": {
    "affected_screens": [
      "/dashboard?projects=1"
    ],
    "affected_components": [
      "src/components/projects/ProjectsTableModal.tsx:46",
      "src/app/globals.css"
    ],
    "behavior_before": "Underlying creation-form and shell text is visible through the modal panel in dark mode.",
    "behavior_after": "Use a sufficiently opaque modal surface and consistent overlay token in both themes.",
    "acceptance_criteria": [
      "Given /dashboard?projects=1 with the same audited state, when the user completes J21, then project rows can be read without background text competing",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-12 HTML and DOCX exports omit populated chapter content

```json
{
  "id": "UX-12",
  "title": "HTML and DOCX exports omit populated chapter content",
  "category": "ERROR_RECOVERY",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J18 / J20",
  "screen": "Preview → HTML / Word export",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "CORE",
  "friction_type": "ERROR_RECOVERY_FRICTION",
  "severity": "CRITICAL",
  "priority": "P1",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-049 / preview-page2",
    "B-003 / chapters-desktop",
    "B-025 / export-state",
    "MEASURED_CODE: src/lib/document/from-html.ts:154 + src/lib/preview/content-paginator.ts:25 + src/lib/compose/preview-adapter.ts:102 + src/lib/projects/export-builder.tsx:192",
    "Downloaded PRODUCTION artifacts: test-export.html (3 pages, empty placeholder), test-export.docx (3 image pages); local artifact rendering UNKNOWN environment, export-html-empty.png and docx-page-2.jpg"
  ],
  "frequency": "RECURRING",
  "current_behavior": "A six-chapter QA project renders content in the editor and full preview, but downloaded HTML has three pages and Contenido aún no disponible; DOCX has three images including the same empty-content placeholder.",
  "root_ux_cause": "Client and server composition diverge. Current code silently returns no blocks when the server DOM runtime is unavailable; this is a plausible cause, not a verified deployed runtime diagnosis.",
  "why_it_matters": "The core deliverable can appear successfully exported while losing the manuscript.",
  "user_impact": "The core deliverable can appear successfully exported while losing the manuscript.",
  "recommended_change": "Make export consume the validated canonical document; fail with an actionable error if populated chapters produce no content. Verify server parsing in the actual deployed runtime.",
  "why_this_change": "Client and server composition diverge. Current code silently returns no blocks when the server DOM runtime is unavailable; this is a plausible cause, not a verified deployed runtime diagnosis. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "HTML and DOCX contain the populated chapters and cannot silently succeed with an empty-content placeholder",
  "effort": "HIGH",
  "risk": "HIGH",
  "quick_win": false,
  "dependencies": [
    "src/lib/document/from-html.ts:154 + src/lib/preview/content-paginator.ts:25 + src/lib/compose/preview-adapter.ts:102 + src/lib/projects/export-builder.tsx:192"
  ],
  "do_not_break": [
    "Persisted source content",
    "Cover appearance",
    "Safe ownership checks and downloadable filenames"
  ],
  "historical_id": null,
  "change_class": "NEW_FINDING / DIFFERENT_COVERAGE",
  "implementation_guidance": {
    "affected_screens": [
      "Preview → HTML / Word export"
    ],
    "affected_components": [
      "src/lib/document/from-html.ts:154",
      "src/lib/preview/content-paginator.ts:25",
      "src/lib/compose/preview-adapter.ts:102",
      "src/lib/projects/export-builder.tsx:192"
    ],
    "behavior_before": "A six-chapter QA project renders content in the editor and full preview, but downloaded HTML has three pages and Contenido aún no disponible; DOCX has three images including the same empty-content placeholder.",
    "behavior_after": "Make export consume the validated canonical document; fail with an actionable error if populated chapters produce no content. Verify server parsing in the actual deployed runtime.",
    "acceptance_criteria": [
      "Given Preview → HTML / Word export with the same audited state, when the user completes J18 / J20, then HTML and DOCX contain the populated chapters and cannot silently succeed with an empty-content placeholder",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-13 Word and PDF downloads are image-only documents

```json
{
  "id": "UX-13",
  "title": "Word and PDF downloads are image-only documents",
  "category": "ACCESSIBILITY",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J19 / J20",
  "screen": "Preview → Word / PDF export",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "CORE",
  "friction_type": "DISCOVERABILITY_FRICTION",
  "severity": "HIGH",
  "priority": "P1",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-025 / export-state",
    "MEASURED_CODE: src/lib/projects/export-builder.tsx:913 + src/components/projects/PdfExportButton.tsx:464",
    "Artifact inspection: DOCX XML has zero w:t nodes; pdfinfo 27 pages, Tagged:no; pdftotext yields only 27 form feeds. Files downloaded from the authorized QA project."
  ],
  "frequency": "RECURRING",
  "current_behavior": "DOCX contains no w:t text nodes and embeds page images. The 27-page PDF has no extracted text and is not tagged.",
  "root_ux_cause": "Export prioritizes page rasterization over document semantics.",
  "why_it_matters": "Word output cannot be edited as normal text; exported PDF text cannot be searched, selected or read structurally by assistive technology.",
  "user_impact": "Word output cannot be edited as normal text; exported PDF text cannot be searched, selected or read structurally by assistive technology.",
  "recommended_change": "Provide semantic DOCX runs, paragraphs and headings; preserve selectable text and structure in PDF, or explicitly label an image-fidelity export as a separate option.",
  "why_this_change": "Export prioritizes page rasterization over document semantics. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "Word is text-editable and the standard PDF has selectable, readable document text",
  "effort": "HIGH",
  "risk": "HIGH",
  "quick_win": false,
  "dependencies": [
    "src/lib/projects/export-builder.tsx:913 + src/components/projects/PdfExportButton.tsx:464"
  ],
  "do_not_break": [
    "Cover fidelity",
    "Existing pagination intent",
    "Explicit visual-export option where needed"
  ],
  "historical_id": null,
  "change_class": "NEW_FINDING / DIFFERENT_COVERAGE",
  "implementation_guidance": {
    "affected_screens": [
      "Preview → Word / PDF export"
    ],
    "affected_components": [
      "src/lib/projects/export-builder.tsx:913",
      "src/components/projects/PdfExportButton.tsx:464"
    ],
    "behavior_before": "DOCX contains no w:t text nodes and embeds page images. The 27-page PDF has no extracted text and is not tagged.",
    "behavior_after": "Provide semantic DOCX runs, paragraphs and headings; preserve selectable text and structure in PDF, or explicitly label an image-fidelity export as a separate option.",
    "acceptance_criteria": [
      "Given Preview → Word / PDF export with the same audited state, when the user completes J19 / J20, then Word is text-editable and the standard PDF has selectable, readable document text",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-14 Mobile chapter editor opens a clipped desktop spread

```json
{
  "id": "UX-14",
  "title": "Mobile chapter editor opens a clipped desktop spread",
  "category": "RESPONSIVE",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J10",
  "screen": "Chapter editor · 390/430px",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "CORE",
  "friction_type": "RESPONSIVE_FRICTION",
  "severity": "HIGH",
  "priority": "P1",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-020 / editor-390x844",
    "B-021 / editor-430x932",
    "MEASURED_CODE: src/components/projects/AdvancedRichTextEditor.tsx:1170 + src/components/projects/advanced-chapter-editor/ChapterEditorFullscreen.tsx:244"
  ],
  "frequency": "RECURRING",
  "current_behavior": "At 390px the document width measures 521px. The desktop double-page view remains active; text is clipped and editor chrome pushes content to about y=560. At 430px width remains 521px.",
  "root_ux_cause": "Persisted document device mode and two-page view are not adapted to the physical viewport.",
  "why_it_matters": "Mobile authors cannot comfortably read or edit the opening chapter without first understanding document device controls.",
  "user_impact": "Mobile authors cannot comfortably read or edit the opening chapter without first understanding document device controls.",
  "recommended_change": "Keep export format independent from physical editor layout; adapt the visible editor to a single fitted column on narrow screens and progressively disclose secondary toolbar groups.",
  "why_this_change": "Persisted document device mode and two-page view are not adapted to the physical viewport. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "chapter text is readable without horizontal clipping at 390 and 430px while export format is preserved",
  "effort": "MEDIUM",
  "risk": "MEDIUM",
  "quick_win": false,
  "dependencies": [
    "src/components/projects/AdvancedRichTextEditor.tsx:1170 + src/components/projects/advanced-chapter-editor/ChapterEditorFullscreen.tsx:244"
  ],
  "do_not_break": [
    "Desktop spread mode",
    "Keyboard shortcuts",
    "Document formatting and source content"
  ],
  "historical_id": null,
  "change_class": "NEW_FINDING / DIFFERENT_COVERAGE",
  "implementation_guidance": {
    "affected_screens": [
      "Chapter editor · 390/430px"
    ],
    "affected_components": [
      "src/components/projects/AdvancedRichTextEditor.tsx:1170",
      "src/components/projects/advanced-chapter-editor/ChapterEditorFullscreen.tsx:244"
    ],
    "behavior_before": "At 390px the document width measures 521px. The desktop double-page view remains active; text is clipped and editor chrome pushes content to about y=560. At 430px width remains 521px.",
    "behavior_after": "Keep export format independent from physical editor layout; adapt the visible editor to a single fitted column on narrow screens and progressively disclose secondary toolbar groups.",
    "acceptance_criteria": [
      "Given Chapter editor · 390/430px with the same audited state, when the user completes J10, then chapter text is readable without horizontal clipping at 390 and 430px while export format is preserved",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-15 The first editor step exposes composition before writing

```json
{
  "id": "UX-15",
  "title": "The first editor step exposes composition before writing",
  "category": "COGNITIVE_LOAD",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J8 → J9",
  "screen": "Editor · Content step",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "FREQUENT",
  "friction_type": "COGNITIVE_FRICTION",
  "severity": "MEDIUM",
  "priority": "P2",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-024 / editor-setup",
    "MEASURED_CODE: src/components/projects/ProjectWorkspace.tsx:438 + src/components/projects/DocumentRulesPanel.tsx"
  ],
  "frequency": "RECURRING",
  "current_behavior": "After opening the project, the Content stage exposes title/author/subtitle, four publication metadata fields, 15 composition-rule controls, brand profile and health/history panels before the chapter workspace.",
  "root_ux_cause": "Setup, publication preparation and advanced composition share the initial stage. These controls are mostly defaulted, not mandatory creation inputs.",
  "why_it_matters": "First-time authors must distinguish optional editorial configuration from the action needed to begin writing.",
  "user_impact": "First-time authors must distinguish optional editorial configuration from the action needed to begin writing.",
  "recommended_change": "Keep title and an obvious Write/import next action primary; group advanced metadata/rules behind contextual disclosure while preserving project defaults and specialist access.",
  "why_this_change": "Setup, publication preparation and advanced composition share the initial stage. These controls are mostly defaulted, not mandatory creation inputs. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "an author can reach chapters without interpreting optional composition settings",
  "effort": "MEDIUM",
  "risk": "MEDIUM",
  "quick_win": false,
  "dependencies": [
    "src/components/projects/ProjectWorkspace.tsx:438 + src/components/projects/DocumentRulesPanel.tsx"
  ],
  "do_not_break": [
    "Template-provided defaults",
    "Full rule capability",
    "Brand profiles remain independent of product templates"
  ],
  "historical_id": null,
  "change_class": "NEW_FINDING / DIFFERENT_COVERAGE",
  "implementation_guidance": {
    "affected_screens": [
      "Editor · Content step"
    ],
    "affected_components": [
      "src/components/projects/ProjectWorkspace.tsx:438",
      "src/components/projects/DocumentRulesPanel.tsx"
    ],
    "behavior_before": "After opening the project, the Content stage exposes title/author/subtitle, four publication metadata fields, 15 composition-rule controls, brand profile and health/history panels before the chapter workspace.",
    "behavior_after": "Keep title and an obvious Write/import next action primary; group advanced metadata/rules behind contextual disclosure while preserving project defaults and specialist access.",
    "acceptance_criteria": [
      "Given Editor · Content step with the same audited state, when the user completes J8 → J9, then an author can reach chapters without interpreting optional composition settings",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-16 Large stage headers relegate the editorial workspace

```json
{
  "id": "UX-16",
  "title": "Large stage headers relegate the editorial workspace",
  "category": "APPLICATION_SHELL",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J8 / J14",
  "screen": "Editor + Cover Studio",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "FREQUENT",
  "friction_type": "WORKSPACE_RELEGATION_FRICTION",
  "severity": "MEDIUM",
  "priority": "P2",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-024 / editor-setup",
    "B-004 / cover-desktop",
    "MEASURED_CODE: src/components/projects/ProjectWorkspace.tsx:739 + src/app/(app)/projects/[projectId]/cover/page.tsx"
  ],
  "frequency": "RECURRING",
  "current_behavior": "At 1440×900 the editor main begins at y≈440; the cover canvas container begins around y≈423 and actual cover around y≈601. Global header itself is about 72px, so stage headings/progress are major contributors.",
  "root_ux_cause": "Stage identity, progress and explanatory chrome occupy multiple large stacked regions.",
  "why_it_matters": "Authors scroll before the document becomes dominant; the surface emphasizes setup over sustained content work.",
  "user_impact": "Authors scroll before the document becomes dominant; the surface emphasizes setup over sustained content work.",
  "recommended_change": "Compact stage headings and progress after onboarding, keep project identity persistent and move infrequent explanations into disclosure. Validate workspace gains at the same viewports.",
  "why_this_change": "Stage identity, progress and explanatory chrome occupy multiple large stacked regions. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "the primary editing or design surface begins materially higher without hiding frequent actions",
  "effort": "MEDIUM",
  "risk": "MEDIUM",
  "quick_win": false,
  "dependencies": [
    "src/components/projects/ProjectWorkspace.tsx:739 + src/app/(app)/projects/[projectId]/cover/page.tsx"
  ],
  "do_not_break": [
    "Clear current project identity",
    "Stage navigation",
    "Functional live cover canvas"
  ],
  "historical_id": null,
  "change_class": "NEW_FINDING / DIFFERENT_COVERAGE",
  "implementation_guidance": {
    "affected_screens": [
      "Editor",
      "Cover Studio"
    ],
    "affected_components": [
      "src/components/projects/ProjectWorkspace.tsx:739",
      "src/app/(app)/projects/[projectId]/cover/page.tsx"
    ],
    "behavior_before": "At 1440×900 the editor main begins at y≈440; the cover canvas container begins around y≈423 and actual cover around y≈601. Global header itself is about 72px, so stage headings/progress are major contributors.",
    "behavior_after": "Compact stage headings and progress after onboarding, keep project identity persistent and move infrequent explanations into disclosure. Validate workspace gains at the same viewports.",
    "acceptance_criteria": [
      "Given Editor + Cover Studio with the same audited state, when the user completes J8 / J14, then the primary editing or design surface begins materially higher without hiding frequent actions",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-17 English workflows retain Spanish controls and status copy

```json
{
  "id": "UX-17",
  "title": "English workflows retain Spanish controls and status copy",
  "category": "CONSISTENCY",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J5 / J14 / J15 / J19 / J27",
  "screen": "New project + Cover/Back cover + PDF exporting",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "FREQUENT",
  "friction_type": "CONSISTENCY_FRICTION",
  "severity": "MEDIUM",
  "priority": "P2",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-016 / dashboard-mobile",
    "B-001 / back-cover-en",
    "B-025 / export-state",
    "MEASURED_CODE: src/components/projects/DocumentImporter.tsx + src/lib/projects/cover-templates.ts + src/components/projects/PdfExportButton.tsx:520"
  ],
  "frequency": "RECURRING",
  "current_behavior": "English shell and creation labels coexist with Spanish importer instructions; template names remain Spanish/mixed, and the English export button changes to Exportando PDF....",
  "root_ux_cause": "Messages.ts does not own all user-facing copy; importer, template and PDF status strings are embedded elsewhere.",
  "why_it_matters": "Users changing language encounter incomplete instructions during important tasks.",
  "user_impact": "Users changing language encounter incomplete instructions during important tasks.",
  "recommended_change": "Move operational strings and template display names into the locale contract, then test rendered ES/EN paths including transient statuses.",
  "why_this_change": "Messages.ts does not own all user-facing copy; importer, template and PDF status strings are embedded elsewhere. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "English task instructions, template labels and export status remain English throughout the journey",
  "effort": "MEDIUM",
  "risk": "LOW",
  "quick_win": false,
  "dependencies": [
    "src/components/projects/DocumentImporter.tsx + src/lib/projects/cover-templates.ts + src/components/projects/PdfExportButton.tsx:520"
  ],
  "do_not_break": [
    "User-authored manuscript language",
    "Existing working shell locale switch"
  ],
  "historical_id": null,
  "change_class": "NEW_FINDING / DIFFERENT_COVERAGE",
  "implementation_guidance": {
    "affected_screens": [
      "New project",
      "Cover/Back cover",
      "PDF exporting"
    ],
    "affected_components": [
      "src/components/projects/DocumentImporter.tsx",
      "src/lib/projects/cover-templates.ts",
      "src/components/projects/PdfExportButton.tsx:520"
    ],
    "behavior_before": "English shell and creation labels coexist with Spanish importer instructions; template names remain Spanish/mixed, and the English export button changes to Exportando PDF....",
    "behavior_after": "Move operational strings and template display names into the locale contract, then test rendered ES/EN paths including transient statuses.",
    "acceptance_criteria": [
      "Given New project + Cover/Back cover + PDF exporting with the same audited state, when the user completes J5 / J14 / J15 / J19 / J27, then English task instructions, template labels and export status remain English throughout the journey",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

### UX-18 Project modal does not contain keyboard focus or close on Escape

```json
{
  "id": "UX-18",
  "title": "Project modal does not contain keyboard focus or close on Escape",
  "category": "MODAL_UX",
  "finding_scope": "PRODUCT_UX",
  "surface": "APPLICATION",
  "journey": "J21",
  "screen": "/dashboard?projects=1",
  "user_type": "AUTHOR / RETURNING_AUTHOR",
  "task_criticality": "CORE",
  "friction_type": "CONTEXT_SWITCH_FRICTION",
  "severity": "HIGH",
  "priority": "P1",
  "evidence_level": "MEASURED_BROWSER",
  "browser_environment": "PRODUCTION",
  "evidence": [
    "B-037 / modal-keyboard",
    "MEASURED_CODE: src/components/projects/ProjectsTableModal.tsx:21"
  ],
  "frequency": "RECURRING",
  "current_behavior": "After opening the modal, Escape leaves role=dialog present. Focusing Close then Shift+Tab twice places focus outside the dialog.",
  "root_ux_cause": "The bespoke modal declares aria-modal but does not implement a corresponding keyboard lifecycle.",
  "why_it_matters": "Keyboard users can interact with hidden background controls and cannot rely on the normal dismissal shortcut.",
  "user_impact": "Keyboard users can interact with hidden background controls and cannot rely on the normal dismissal shortcut.",
  "recommended_change": "Use the canonical accessible dialog primitive or implement initial focus, focus containment, Escape dismissal and restoration to the initiating control.",
  "why_this_change": "The bespoke modal declares aria-modal but does not implement a corresponding keyboard lifecycle. The recommendation addresses the specific failed task rather than changing visual style alone.",
  "expected_benefit": "Escape dismisses the modal and keyboard focus stays inside until close, then returns to the opener",
  "effort": "MEDIUM",
  "risk": "MEDIUM",
  "quick_win": false,
  "dependencies": [
    "src/components/projects/ProjectsTableModal.tsx:21"
  ],
  "do_not_break": [
    "Table pagination",
    "Row operations",
    "Focus must not jump to a destructive action"
  ],
  "historical_id": null,
  "change_class": "NEW_FINDING / DIFFERENT_COVERAGE",
  "implementation_guidance": {
    "affected_screens": [
      "/dashboard?projects=1"
    ],
    "affected_components": [
      "src/components/projects/ProjectsTableModal.tsx:21"
    ],
    "behavior_before": "After opening the modal, Escape leaves role=dialog present. Focusing Close then Shift+Tab twice places focus outside the dialog.",
    "behavior_after": "Use the canonical accessible dialog primitive or implement initial focus, focus containment, Escape dismissal and restoration to the initiating control.",
    "acceptance_criteria": [
      "Given /dashboard?projects=1 with the same audited state, when the user completes J21, then Escape dismisses the modal and keyboard focus stays inside until close, then returns to the opener",
      "Given ES/EN and light/dark at 390, 768 and 1440 CSS pixels, when the affected control or state is used, then labels, focus, content and recovery remain usable."
    ],
    "ux_regression_risks": [
      "Do not reset document or selected project state.",
      "Retest the corresponding browser evidence state and adjacent navigation path."
    ]
  }
}
```

## 37 Product access findings

No PRODUCT_ACCESS finding was established. Production was reachable and authorized credential login succeeded. DEPLOYED_HEAD_MATCH remains UNKNOWN; this is a provenance limitation, not an access defect.

## 38 Supporting engineering findings

No target ENGINEERING_SUPPORT issue is promoted to a material product finding. The installed audit skill has version metadata inconsistency and optimistic static defaults; these are methodology/tooling limitations, excluded from product scores.

Local project dependencies are not installed in this workspace. No build or package installation was run because the allowed write scope is restricted to audit artifacts. This does not establish a deployed build failure.

## 39 Compliance review items

No definitive legal compliance assertion is made. COMPLIANCE_GUARD_RESULT=PASS: concerns are framed as trust/evidence questions; no legal certification is issued. The AOS compliance preflight verifies governance context, not legal compliance.

Legal footer links and cookie preferences are visible. Consent behavior, jurisdictional adequacy and legal copy completeness were not fully audited; qualified legal review would be required for such conclusions.

## 40 Quick wins

| Finding | Change area | Benefit |
| --- | --- | --- |
| UX-03 | Registration validation does not explain what to correct | the invalid field and correction are stated while valid input is retained |
| UX-05 | Public and auth surfaces lack a main landmark | landmark navigation reaches the main offer or auth form directly |
| UX-06 | Password visibility toggle remains about 18 × 18 px | the visibility action has a reliable hit area and retains its accessible name |
| UX-07 | Chapter move and delete controls remain unnamed | each chapter action can be identified by verb and target chapter |
| UX-08 | Mobile brand text overlaps the navigation button | brand and navigation hit areas remain visually distinct at 390px |
| UX-09 | Navigation destinations are implemented as buttons | destinations support open-in-new-tab and link discovery without losing pending feedback |

## 41 Structural opportunities

One validated semantic document should travel through editor, preview and every export format. Detect empty conversion as a failure rather than allowing a downloadable placeholder. Semantic export and visual-fidelity export should be explicit product choices.

One project retrieval model should serve both a full library and an optional quick switcher. Search, recency and title disambiguation matter more than whether the inventory uses cards or a table.

A continuous editorial workspace can keep project identity and frequent actions compact while revealing metadata, rules and publishing controls when they become relevant. Preserve specialist power without front-loading every decision.

## 42 Recommended roadmap

| Phase | Findings | Outcome |
| --- | --- | --- |
| Phase 1 · Integrity gate | UX-12 | Reproduce production export mismatch with populated safe fixtures; fail closed on missing content; validate output before release. |
| Phase 1 · Immediate access | UX-07/06/05/08/09 | Names, hit areas, landmarks, mobile brand layout and real destination links. |
| Phase 2 · Recovery and keyboard | UX-02/03/18 | Account recovery, actionable registration errors, accessible project dialog lifecycle. |
| Phase 2 · Usable authoring/export | UX-13/14/17 | Semantic exports, fitted mobile editor and complete operational localization. |
| Phase 3 · Continuous studio | UX-04/15/16 | Shared project inventory and workspace-first disclosure after integrity is reliable. |
| Phase 3 · Polish | UX-10/11 | Auth entry parity and modal surface consistency. |

## 43 DO_NOT_BREAK

Preserve persisted manuscripts, chapter order, project ownership and auth boundaries. The audit never authorizes remediation writes.

Preserve full preview pagination, cover canvas feedback, device/publication options, existing composition defaults, project update ordering, named row actions and visible theme/language preferences.

Do not flatten an expert editorial tool into a sparse marketing interface. Reduce irrelevant persistence of controls, not capability. Do not solve export content loss by returning a visually attractive empty document.

## 44 Evidence coverage

BROWSER_AVAILABLE=TRUE; PRODUCTION_BROWSER_COVERED=TRUE; DEPLOYED_SURFACE_COVERED=TRUE. This means deployed screens were observed, not that their SHA was verified. PREVIEW_BROWSER_COVERED=FALSE; LOCAL_BUILD_BROWSER_COVERED=FALSE.

Authenticated and public surfaces were covered materially, but full creation/import/save/delete/session-recovery journeys were intentionally not completed. PROJECT_SCALE_COVERED=TRUE for the existing 57-project account; no synthetic inventory was created.

The complete screenshot/DOM evidence index follows. Representative screenshots are embedded in the report; every captured screenshot remains available in the evidence directory. No hidden carousel, collapsed finding, or scrolling print container is used.

| Coverage field | Value / limit |
| --- | --- |
| PREVIEW_BROWSER_COVERED | False |
| LOCAL_BUILD_BROWSER_COVERED | False |
| DOCUMENT_IMPORT_COVERED | False |
| PROJECT_CREATION_COVERED | False |
| OAUTH_COMPLETION_COVERED | False |
| SESSION_RECOVERY_COVERED | False |
| I18N_COMPOSED | False |
| VISUAL_REGRESSION_COMPOSED | False |
| BROWSER_AVAILABLE | True |
| PRODUCTION_BROWSER_COVERED | True |
| DEPLOYED_SURFACE_COVERED | True |
| PUBLIC_FLOWS_COVERED | True |
| AUTHENTICATED_FLOWS_COVERED | True |
| DESKTOP_COVERED | True |
| TABLET_COVERED | True |
| MOBILE_PORTRAIT_COVERED | True |
| MOBILE_LANDSCAPE_COVERED | True |
| LIGHT_THEME_COVERED | True |
| DARK_THEME_COVERED | True |
| LANDING_COVERED | True |
| AUTH_COVERED | True |
| PASSWORD_RECOVERY_COVERED | True |
| PROJECT_MANAGEMENT_COVERED | True |
| PROJECT_SCALE_COVERED | True |
| APPLICATION_SHELL_COVERED | True |
| VIEWPORT_ECONOMY_MEASURED | True |
| PREMIUM_PRODUCT_SURFACE_COVERED | True |
| ACCESSIBILITY_COMPOSED | True |
| DESIGN_SYSTEM_COMPOSED | True |
| SURFACE_MODE | APPLICATION |
| SURFACE_MODE_SOURCE | OVERRIDE |
| SURFACE_MODE_CONFIDENCE | HIGH |
| PLATFORM_MODE | WEB |
| PLATFORM_MODE_SOURCE | OVERRIDE |
| SECONDARY_SURFACES | ['LANDING_PAGE'] |
| BROWSER_ENVIRONMENT_COVERAGE | ['PRODUCTION'] |
| DEPLOYED_HEAD_MATCH | UNKNOWN |
| CHAPTERS_COVERED | PARTIAL — inspection only |
| TIPTAP_EDITOR_COVERED | PARTIAL — no save |
| COVER_STUDIO_COVERED | PARTIAL — live local changes, no save |
| BACK_COVER_COVERED | PARTIAL — inspection only |
| PREVIEW_COVERED | PARTIAL — representative pages and devices |
| EXPORT_HTML_COVERED | TRUE — transport and integrity failure verified |
| EXPORT_PDF_COVERED | PARTIAL — transport/text-layer/sample appearance; full fidelity unverified |
| EXPORT_DOCX_COVERED | TRUE — ZIP/image/text integrity checked |
| AUTHENTICATED_FLOWS_COVERED_NOTE | Representative reads and local interactions, not complete persisted journeys |
| HISTORICAL_FINDINGS_RETESTED | 11 |
| HISTORICAL_FINDINGS_NOT_RETESTED | 0 |
| TOOL_COMPATIBILITY_GAPS | ['i18n-integrity-check: zero JSON locales', 'visual-regression-check: executed=false'] |
| ACCESSIBILITY_COVERAGE | PARTIAL — static + axe + targeted keyboard; not WCAG certification |
| I18N_COVERAGE | PARTIAL — rendered ES/EN representative paths; composed adapter gap |
| CURRENT_SKILL_SCHEMA_COVERAGE | Current report model rendered; manifest/runtime discrepancy recorded |
| APPLICATION_PROFILE_COVERAGE | PARTIAL — all active lenses addressed, persistence gaps explicit |
| SECONDARY_SURFACE_COVERAGE | LANDING_PAGE representative interaction/viewport/theme coverage |
| FINDING_SCOPE_COVERAGE | 18 / 18 explicit PRODUCT_UX |
| COMPLIANCE_GUARD_RESULT | PASS — no legal-compliance determination |

Browser evidence register: evidence/anclora-talent-2026-09-09/browser-evidence-index.json

## 45 Tool compatibility gaps

| Skill | Execution state | Material coverage | Interpretation |
| --- | --- | --- | --- |
| repo-preflight | COMPLETED | TRUE | Initial worktree clean; later only audit evidence untracked. |
| aos-compliance-preflight | COMPLETED | TRUE | Adoption and canonical registry found; not legal compliance. |
| accessibility-audit | COMPLETED | TRUE — static only | Execution result FAIL contains candidates; browser checks supplement, no compliance pass. |
| visual-regression-check | COMPLETED | FALSE | executed=false; adapter supplies no baseline comparison. TOOL_COMPATIBILITY_GAP. |
| design-system-consumer-check | COMPLETED | TRUE — partial | Pinned package and consumer files detected; not rendered conformance certification. |
| i18n-integrity-check | COMPLETED | FALSE | 0 locales; messages.ts not recognized. TOOL_COMPATIBILITY_GAP. |
| change-impact-analysis | NOT_APPLICABLE | FALSE | No application change proposed; invoked, returned empty change set. No artificial tool gap for a non-applicable scope. |
| ux-product-experience-review | COMPLETED | TRUE — agent augmented | Static candidates checked against browser; score defaults not accepted as evidence. Manifest 1.4.0 vs contract/runtime 1.5.0. |

## 46 Limitations and audit integrity

READ_ONLY: only report, screenshots and evidence files were authored. No source/config/env edits, commits, pushes, deployments, database writes, project creation/deletion or persisted editorial edits. Auth session establishment was limited to the explicitly authorized test account. Invalid registration was rejected before writes.

Authenticated editor navigation has automatic persistence; requests were intercepted before transmission. The first abort-induced error is not a product defect; held requests mean saved-state coverage is unavailable. One isolated browser session became unavailable after export work; captured evidence was retained and remaining inventory checks continued in the other session.

OLD_HEAD, deployed SHA and deployment URL inventory beyond known production are UNKNOWN. GitHub deployment lookup was blocked by missing gh authentication. No local build was used to substitute for production.

Full export visual fidelity, complete keyboard traversal, screen-reader speech output, all contrast states, import failure, OAuth round trips and expired-session recovery remain gaps. Runtime static results use legacy evidence labels; report conclusions normalize them to MEASURED_CODE/DECLARED_DOCS and never use generic MEASURED.

HTML validation, anchors, counts, screenshot decoding and print checks are reported by validation evidence. Artifact validity and audit coverage are separate: an intact report can describe a PASS_WITH_GAPS audit.

## 47 Final comparative answer

| Required question | Evidence-grounded answer |
| --- | --- |
| 1 · Can a new user move from idea/source to export without understanding architecture? | Not reliably demonstrated. The first form has useful defaults, but the initial editor exposes specialist configuration and the tested HTML/Word outputs lose content. Creation/import persistence was excluded, so no end-to-end success claim is made. |
| 2 · Can a returning author with dozens of projects resume quickly? | Not efficiently at the audited scale. All 57 projects remain manually scanned across two inventories without search/filter/user sorting; pagination helps transport, not retrieval. |
| 3 · Is this a coherent premium editorial studio? | There is a credible studio foundation, especially cover and full-screen authoring. The outer wizard, empty preview entry and broken export continuity still make it feel like connected tools more than one dependable workspace. |
| 4 · Which historical findings changed? | OLD-F01 through OLD-F11 are all STILL_PRESENT. FIXED=0; PARTIALLY_FIXED=0; REGRESSED=0; NO_LONGER_APPLICABLE=0; NOT_RETESTED=0; CANNOT_RETEST=0. |
| 5 · Which findings are new? | UX-12/13/14/16/17/18 are newly established issues beyond the eleven findings. UX-15 is a newly formalized finding that was already discussed as decision load in the old executive summary. None is proven newly introduced after September 5. |
| 6 · What explains the audit difference? | Different evidence coverage and stricter evaluation are demonstrated. Real product improvement is not established. Surface-aware methodology changes organization and calibration; artifact inspection adds materially deeper export evidence. |
| 7 · What prevents premium reactivation readiness? | First resolve manuscript export integrity, semantic accessibility, mobile authoring and keyboard containment. Then address recovery, project retrieval and setup/workspace hierarchy. Preserve cover/preview strengths. The paused roadmap does not excuse these gaps. |

## Final artifact validation

```json
{
  "HTML_VALIDATION": "PASS",
  "VISUAL_VALIDATION": "PASS",
  "PRINT_VALIDATION": "PASS",
  "SCREENSHOT_VALIDATION": "PASS",
  "FINDING_COUNT_VALIDATION": "PASS",
  "HISTORICAL_MATRIX_VALIDATION": "PASS",
  "ANCHOR_VALIDATION": "PASS",
  "ARTIFACT_RESULT": "PASS",
  "HTML_FINDING_COUNT": 18,
  "REPORTED_FINDING_COUNT": 18,
  "HTML_HISTORICAL_FINDING_COUNT": 11,
  "HISTORICAL_MATRIX_COUNT": 11,
  "TABLE_OF_CONTENTS_SECTION_COUNT": 48,
  "RENDERED_SECTION_COUNT": 48,
  "EMBEDDED_SCREENSHOTS": 25,
  "SCREEN_TRAVERSAL_VIEWPORTS": 199,
  "DESKTOP_HORIZONTAL_OVERFLOW": false,
  "MOBILE_HORIZONTAL_OVERFLOW": false,
  "BROKEN_ANCHORS": 0,
  "BROKEN_IMAGES": 0,
  "PRINT_FIXED_STICKY_ELEMENTS": 0,
  "PRINT_CLIPPED_CONTAINERS": 0,
  "summary": "PASS \u2014 48/48 sections, 18/18 complete findings, 11/11 historical records, 25/25 embedded images and all anchors verified. Full browser traversal, 390 px layout and rendered A4 output inspected; no material truncation. Audit status remains PASS_WITH_GAPS.",
  "validation_environment": "LOCAL_FILE report validation, not production product evidence",
  "evidence_directory": "validation/",
  "PRINT_PAGE_COUNT": 202,
  "PRINT_EMPTY_PAGES": [],
  "PRINT_FINDING_TITLES_PRESENT": 18,
  "PRINT_HISTORICAL_IDS_PRESENT": 11,
  "PRINT_IMPLEMENTATION_GUIDANCE_BLOCKS": 18,
  "LAST_SECTION_COMPLETE": true,
  "LAST_FINDING_COMPLETE": true
}
```
