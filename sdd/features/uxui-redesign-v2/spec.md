# Spec: UX/UI Redesign v2 (uxui-redesign-v2)

Source of truth: master prompt v2.1 (session 2026-08-05). This spec mirrors its scope; the prompt wins on conflict.

## Goal
Ship the UX/UI redesign that two previous runs failed to deliver: clean sidebar, correct collapse, simplified dashboard, robust uploads, optional project creation, document-data modal with composition/brand scoping, i18n parity, and mandatory visual validation with before/after evidence per unit.

## Units (acceptance criteria)

- **U1 — Clean sidebar** (`src/components/layout/AppShell.tsx`): nav = Dashboard + Mis proyectos only; remove "STACK ACTIVO" and "CONTRATO" cards; remove "PREMIUM APP" badge (logo + "Anclora Talent" only). Proof: grep absence of removed keys.
- **U2 — Correct collapse**: rail 72–88px, centered icons + tooltips; expanded 320px; `grid-template-columns` transition; collapsed state does NOT render the label span (`talent-shell-sidebar-link__label`); aside `min-w-0` + `overflow-hidden`; no main-panel overlap. Proof: screenshots 1366×768 + 1920×1080 expanded/collapsed, no horizontal overflow.
- **U3 — Dashboard** (`src/app/(app)/dashboard/page.tsx`): remove `dashboardCopy.description`, 3 metric cards, hero CTA; compact hero + `data-testid="dashboard-active-count"` chip (only when >0); grid `xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]` — left "Mis proyectos" ProjectCards (empty state w/ CTA), right CreateProjectForm. Proof: grep absence + chip presence.
- **U4 — Robust uploads**: `next.config.ts` bodySizeLimit 25mb (+test); DocumentImporter accepts .docx/.doc/.pdf/.txt/.md full MIME; mammoth/pdf-parse in try/catch; parse failure = non-blocking warning.
- **U5 — Optional creation**: CreateProjectForm with 3 optional labeled sections — manuscript (DocumentImporter + blank-start hint), structure reference (existing StructureReferenceSection), brand manual PDF (new BrandManualInput, `name="brandManual"`). `createProjectAction`: best-effort BrandProfile extraction, active + linked; failure never blocks creation.
- **U6 — Preferences & "Datos del documento" modal**: remove EditorPreferencesSidebar from AppShell; device/view selector lives ONLY in Preview and feeds export (`buildExportQueryString`); modal (MODAL_CONTRACT) auto-opens after import analysis, reopenable from workspace + project card; free values (family, pt size step 0.5, margins presets+custom, line-height); structure via extract-structure-profile with confidences; DOCX extraction via JSZip reading word/styles.xml (Normal: rFonts + sz half-points) → "verified in source"; md/txt → defaults "not extracted"; composition scope: project-only (jsonb on project_documents) vs all-projects (user_preferences, optional overwrite checkbox off); brand scope: this-product vs active default profile with explicit per-project choice incl. "no brand"; hierarchy: project > user > system; brand explicit > default > none.
- **U7 — i18n**: new ES+EN keys with parity; parity test green.
- **U8 — Tests**: update dashboard-grid-contract and dashboard-light-contract; new unit tests (styles.xml, modal scopes, hierarchy). Full verification ONCE per U close + once final.
- **U9 — Mandatory visual validation** at each U close: before baseline + after; surfaces /dashboard (expanded+collapsed), /projects/new, workspace step 1, modal open, /preview; matrix 1440×900, 1366×768, 375×667, dark/light; assertions: no h-overflow, no collapse overlaps, absence of removed elements, chip presence, no avoidable modal scroll; artifacts `test-results/visual/U<n>/before|after-<surface>-<viewport>-<theme>.png`. No green evidence → no commit.
- **U10 — Delivery**: atomic Conventional Commits on `development`, push, PR to development with units, greps, tests, capture paths, Vercel preview URL; note production unchanged until promotion.

## Binding rules
Work only on `development`. Batch verification (lint/test:run/build/tsc, zero NEW tsc errors vs Archive/ baseline) once per U close. i18n ES/EN. Server-side authorization. Code wins — document reality. No scope substitution; if a unit is unviable, deliver the rest and report.
