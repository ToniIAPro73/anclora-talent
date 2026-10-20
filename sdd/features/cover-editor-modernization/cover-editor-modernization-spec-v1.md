# Cover editor modernization — specification v1

Status: active, phased implementation. Date: 2026-10-20.

## Goal

Make the cover and back-cover editor easier to scan and use by giving the canvas priority, placing layers in a dedicated workspace, and sizing tool controls in proportion to the viewport. Use Talent-token surfaces in both themes. Keep one compact global header with the brand, Dashboard, language/theme toggles, and user menu.

## Verified baseline

- Project workspace and dedicated cover/back-cover routes mount the shared `CoverStudioV2` wrapper.
- `CoverStudioV2` autosaves the active surface sequentially and exposes Save final state.
- `AdvancedCoverEditor` edits a controlled `DesignSurface`; tools, layers, canvas, and properties occupy distinct regions.
- `BasicCoverEditor` and Professional mode edit the same controlled `DesignSurface`; Basic templates use a dropdown.
- `CoverStudioV2` exposes versioned JSON import/export and native-resolution PNG export in both modes.
- Focused tests pass; shared browser evidence covers direct cover/back-cover routes at 390px, 768px, and 1440px. Browser JSON re-import remains unverified because the local browser refused to read the selected file.

## Design requirements

1. Keep the eight-step workflow and document artwork unchanged. The global header stays limited to brand, Dashboard, language/theme toggles, and user menu on every route; preview and document metadata remain in the workflow where they belong.
2. Use a dedicated, full-height, independently scrollable layers column adjacent to the canvas.
3. Keep add-content tools distinct from layer actions and retain every existing action.
4. Give the canvas the largest flexible grid column. Reduce tool/layer/inspector widths on desktop, and use a compact icon ribbon with accessible names on mobile.
5. Derive editor surfaces from official Talent theme tokens. Preserve accent and control states.
6. Keep front/back as separate persisted surfaces and preserve the same canonical model across Basic and Professional modes.
7. Deliver validated, versioned editable JSON with explicit unsupported-field errors and portable assets before claiming JSON parity.
8. Preserve and verify undo/redo, guides, save, source-PDF behavior, export, and responsive behavior. New editorial preflight/profile/proof/resize features require separate tasks and evidence.

## Acceptance criteria for this phase

- The Professional editor exposes four clear regions: tool rail, layer workspace, canvas, and property inspector; panel widths leave the largest practical area to the canvas.
- Layers remain visible in their own scroll container and are not part of the right inspector's scroll.
- The canvas uses the remaining width; at narrow viewports the tool ribbon stays compact, the canvas remains first, and the layers and properties stay reachable below it.
- Both themes use official Talent tokens for panel/stage surfaces and retain existing accent controls.
- Existing layer selection, property editing, add-content tools, and layer actions continue to work.
- The global header contains only the application brand, Dashboard, language/theme toggles, and user menu; workflow actions stay in their relevant steps.
- Focused component tests pass. Visual browser evidence is recorded before describing the visual refresh as verified.

## Required follow-on acceptance gates

- Basic and Professional are reachable on the same controlled document in both routes/surfaces.
- JSON import/export passes schema, size, unknown-field, asset portability, and two-surface round-trip checks without silent loss.
- The parity matrix closes each capability only with focused behavioral evidence; no unsupported print readiness is implied.
- Visual QA covers cover/back-cover, Basic/Professional, Light/Dark, and affected viewport classes through the shared Anclora visual runtime.

## Scope limits

No database, infrastructure, credentials, storage, deployment, promotion, or print-certification changes. Existing server save actions remain the persistence boundary. Work stays on `development` per workspace policy.
