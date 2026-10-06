# Cover Editor V1 — Unified 08A

## Scope

Replace the visible Basic/Advanced cover mode switch with one unified cover
editor. The existing `DesignSurface` model, persistence actions, Fabric canvas,
template registry, properties controls, layer panel, history, and alignment
helpers remain the implementation foundation.

## Acceptance criteria

- The cover route presents the 08A structure: top header, workflow progress,
  left tool rail/templates, central cover canvas, and contextual properties/layers.
- Basic/Advanced mode controls are not rendered.
- Existing cover surfaces load without migration and save through the existing
  cover action with their complete layer state.
- Templates, text, images, backgrounds, selection, movement, alignment,
  visibility, ordering, undo/redo, preview, and save remain available.
- External image import accepts common raster formats and reports dimensions and
  a low-resolution warning without blocking the import.
- 08B/08C features remain outside scope; the data model stays compatible with
  future groups, guides, bleed, and safe-area work.

## Rendering decision

V1 keeps the existing Fabric-backed canvas. It is the smallest safe change for
continuous drag/resize, keyboard access, selection, and persistence.
