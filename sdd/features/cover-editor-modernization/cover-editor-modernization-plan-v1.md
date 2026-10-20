# Cover editor modernization — plan v1

## Current implementation map

| Concern | Current source | Verified state |
|---|---|---|
| Page/workspace integration | `src/app/(app)/projects/[projectId]/{cover,back-cover}/page.tsx`, `src/components/projects/ProjectWorkspace.tsx`, `src/components/layout/AppShell.tsx` | Shared V2 on both surfaces; global header is compact and consistent |
| Shared state and autosave | `src/components/projects/design-surface/CoverStudioV2.tsx` | One active `DesignSurface`; sequential autosave; Save final |
| Professional editor | `src/components/projects/design-surface/AdvancedCoverEditor.tsx` | Separate tool rail, layers, canvas, and properties; responsive tool controls |
| Basic editor | `src/components/projects/design-surface/BasicCoverEditor.tsx` | Mounted by V2 with shared model and a compact template selector |
| Canvas and interaction | `DesignSurfaceCanvas.tsx`, `CanvasOverlays.tsx`, `CanvasRulers.tsx` | Existing selection, transforms, overlays, snapping, guides |
| Layers and properties | `LayersPanel.tsx`, `PropertiesPanel.tsx`, typed property panels | Independent layer region and canvas-first responsive proportions |
| Theme | `src/app/globals.css`, `docs/standards/TALENT_COLOR_PALETTE.md` | Accent `#4A9FD8`; surfaces must use semantic tokens |
| Editable interchange | `src/lib/projects/cover-design-package.ts`, `CoverStudioV2.tsx` | Versioned JSON package and portable two-surface export; browser re-import read remains unverified |

## Phases

### Phase 1 — Canvas-first layout (this implementation slice)

1. Add a focused failing assembly test for a dedicated layer workspace.
2. Split the current left tools and right layers into separate regions; retain handlers and controls.
3. Add responsive grid rules, proportionate tool/panel sizes, and token-derived theme surfaces.
4. Restrict the global masthead to brand, Dashboard, language/theme controls, and user menu; remove duplicate workflow actions.
5. Run focused editor tests and shared visual QA at the contractual QA level.

### Phase 2 — Mode parity

1. Add a Basic/Professional switch inside the shared V2 host.
2. Keep one controlled `DesignSurface`; preserve advanced-only layer properties when switching to Basic.
3. Verify front and back surface, template, image, background, text, save and reload flows.

### Phase 3 — Editable JSON safety

1. Define a versioned package schema for both surfaces and a validated migration boundary.
2. Define asset bundling that embeds/fetches only portable assets; reject unresolved temporary URLs and unsupported properties visibly.
3. Add round-trip tests for IDs, ordering, styles, backgrounds, guides, origin/status metadata and both surfaces.
4. Add separate JSON actions, clearly distinguished from flattened PNG export.

### Phase 4 — Parity completion and editorial additions

1. Reconcile the source audit against current code and tests.
2. Close missing core editor controls and history/persistence gaps as independent test-first tasks.
3. Implement preflight, reusable collection profiles, proof milestones, and resize constraints only with explicit data and recovery semantics.
4. Run visual and behavioral gates; leave unsupported print claims advisory.

## Verification strategy

- Targeted Vitest tests for each changed interaction; no repeated unchanged gates.
- Type/lint/build gates only at meaningful integration boundaries.
- Use the shared `agent-browser` / `anclora-visual-qa` runtime for visual changes, with a dedicated QA identity if authentication is needed. Do not use the personal account or production data.
- Record executed evidence and exact unverified matrix rows. No deployment or promotion in this task.
