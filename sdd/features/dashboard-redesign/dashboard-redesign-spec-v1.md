# Dashboard redesign — Phase 1

Status: Open. Initial SHA: 1236c2803ca1a57f0b4ee5a1997fd1cb580b8b9d.

## Contract

Use `docs/mockups/workspace-system-v1/00-dashboard-v1.png` as the visual authority, and the existing application as the functional authority. Use `/brand/anclora-talent.webp`. Work directly on development; no promotion. No database migrations or production content changes.

## Scope and acceptance

- Dashboard-only compact shell, project rows (default) and grid toggle, search, sorting, status filter, pagination and recent project updates sidebar.
- Preserve editor, preview, document metadata and confirmed delete actions. Preserve the existing My Projects modal and `/projects` route. New Project links to the unchanged `/projects/new` route; legacy focus query redirects there.
- Show actual draft/active status, chapter/page counts, updated dates, and available saved cover render/thumbnail. Use an editorial typographic cover fallback when absent.
- Do not invent chapter completion, percentages, export events, workflow navigation targets, or current project context. Replace fictional workflow ribbon with existing Dashboard / New Project / My Projects navigation. Recent activity means latest project update timestamps, not an audit log.
- Compact empty, no-results, loading and recoverable error states. All changed copy in ES/EN; semantic tokens support dark/light. Keyboard and mobile navigation accessible.
- Verify 1440, 1280, 1024, 768, 375 widths; no overflow, overlays, browser errors or unexplained network errors.
- Run TypeScript, full Vitest, zero-warning ESLint, build and diff checks; canonical browser QA, mockup comparison and exact development preview smoke before PASS.
- Preserve other workspaces and New Project appearance; scope shell styles to dashboard.

## Evidence

Temporary evidence: `artifacts/qa/dashboard-redesign/`. Maximum two remediation loops. Final report records all acceptance gates, adaptations, SHA and deployment readiness.
