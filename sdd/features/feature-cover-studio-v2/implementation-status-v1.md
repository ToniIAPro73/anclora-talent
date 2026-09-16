# Cover Studio v2 — Implementation Status

Date: 2026-09-16
Branch: `feature/cover-studio-v2`

This document records the verified implementation state after the Claude Code handoff. It supplements the feature specification; it does not change the specification or claim completion for behavior that has not been verified.

## Canonical model and routes

- `DesignSurface` and `DesignLayer` are the single persisted model for Basic, Advanced, preview, and server export.
- Legacy `SurfaceState` values are narrowed and lazily migrated through the existing v1-to-v2 migration path.
- `/projects/[projectId]/cover` and `/projects/[projectId]/back-cover` mount the shared `CoverStudioV2` wrapper while retaining legacy compatibility for non-v2 data.
- Cover and back cover use the same editor implementation with a `surfaceKind` discriminator.

## Verified editor behavior

- Basic and Advanced are controlled views over the same surface; Advanced-only properties remain in the model when switching to Basic.
- Fabric provides selection, free positioning, resize, rotation, keyboard movement, duplicate, delete, undo, redo, and viewport zoom.
- The layer array is the only z-order source of truth. Layer-panel reorder is reconciled into Fabric immediately.
- Layers can be selected from the panel even when covered by another layer. Hidden layers do not participate in rendering or smart-guide reference calculations; locked layers remain visible references and can be selected from the panel.
- Visibility, locking, duplicate, delete, rename, reorder, bring-to-front/forward, and send-to-back/backward controls are available through the layer panel.
- Text, image, and shape properties expose only their relevant controls. Position inspectors expose X, Y, width, height, and rotation.
- Shapes can be added as overlays, including the default semi-transparent overlay used by the Advanced toolbar.

## Alignment, rulers, and guides

- Text alignment has distinct Left, Center, Right, and Justify controls with labels, titles, and pressed state.
- Object alignment is a separate toolbar group with left/center/right and top/center/bottom actions.
- Horizontal and vertical rulers track the current viewport zoom and stay outside the exported surface.
- Canvas-center and layer-edge/center smart guides are rendered during interaction.
- Snap threshold is converted from screen pixels to document coordinates, so the interaction feel remains stable across zoom levels.
- Alt/Option temporarily disables snapping while dragging.
- Distance badges and equal-spacing guides are implemented for horizontal and vertical arrangements and are ephemeral.
- Persistent guides, safe area, grid, rulers, smart guides, and measurement helpers are editor-only and are not consumed by the server renderer.

## Images, filters, and rendering

- Image transforms are non-destructive and accept negative X/Y positions, allowing the image frame to extend outside the cover viewport.
- The original asset reference, frame, scale, rotation, crop, and filters remain in the layer model. Fabric hydration honors explicit crop data and cover-fit framing.
- Required filters are represented in the model and supported by the Fabric client/server path: opacity, brightness, contrast, saturation, and grayscale.
- The DOM preview renderer applies the same required CSS filter set and clips the surface viewport. PNG/PDF export uses the structured Fabric/node renderer and clips to the canvas.
- Tint and blend modes are not enabled because cross-renderer fidelity has not been established.

## Persistence and original PDF handling

- Autosave is debounced and coalesces rapid edits; saves are sent sequentially so an older in-flight request cannot overwrite a newer pending surface.
- Fabric transform events and canonical panel changes are recorded in the canvas history with duplicate snapshot suppression.
- Original PDF assets are preserved. “Use original” and “Edit as base” rasterize a derived page image without modifying the source document. Cover and back-cover page resolution remains explicit in the existing rasterizer contract.

## Verification performed

- Full Vitest suite: 226 test files, 1,446 tests passed.
- Cover Studio v2 targeted tests cover layer geometry, guides/zoom/spacing, text alignment, image transforms/crop hydration, shape properties, object alignment, preview precedence, and Fabric canvas interactions.
- Full ESLint passes with four pre-existing warnings and no errors.
- `next build` passes; Next reports the existing NFT tracing warning for the dynamic Fabric/node export import.

## Remaining gaps and verification limits

- Guide creation/deletion is persisted, but its state is not yet represented in the Fabric JSON history snapshot; guide-specific undo/redo needs a surface-level history extension.
- DOM preview and Fabric/node export are contract-aligned but not pixel-identical renderers; visual parity still requires screenshot review at the requested viewports and themes.
- Tint and blend modes remain intentionally unavailable.
- Global `tsc --noEmit` remains red on pre-existing errors in archive scripts, the old chapter image canvas, and legacy tests; no Cover Studio v2 source error remains in the filtered feature scope.
- Authenticated live-route Playwright execution is blocked in this environment because `/api/auth/register` returns HTTP 500 before any cover route is reached.
- Legacy v1 lazy migration has unit coverage, but a full authenticated edit-and-upgrade route pass remains to be run.
