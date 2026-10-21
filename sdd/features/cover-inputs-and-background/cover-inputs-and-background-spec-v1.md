# Cover text size, transparent background, and image import semantics — spec v1

Status: active. Date: 2026-10-21.

## Goal

Make common cover editing controls predictable and distinguish flattened image imports from editable JSON packages.

## Requirements

1. The text font-size field must allow clearing its current value, typing multi-digit values naturally, and selecting common pixel sizes while retaining manual entry.
2. An explicit “Sin fondo” option must make the active cover or back-cover background transparent without removing any design layers. PNG output must preserve transparency.
3. Background image selection changes only the active surface background and preserves all foreground layers.
4. “Importar portada/contraportada” for a raster image replaces the active surface composition with that flattened image, clearing its existing layers after a confirmation when the current surface is non-empty.
5. Editable JSON import remains a separate operation. It accepts a package containing either or both surfaces, validates and replaces only the surface for the currently open editor, and leaves the other surface unchanged. JSON import is not redundant with flattened image import.
6. The image upload control in background properties uses the same shared Talent button geometry as neighboring editor actions.
7. Existing saved surfaces without a transparent background remain valid and render as before.
8. A background-only image, gradient, or transparent design is recognized as intentional after reload and does not reopen the untouched-surface prompt.

## Acceptance criteria

- Font size can be replaced (e.g. 8 → 18), cleared while typing, and chosen from common pixel presets; invalid/empty input restores the current committed size on blur.
- Selecting “Sin fondo” leaves all layers untouched, displays transparency in the editor, and exports alpha in PNG.
- Background image upload leaves layer IDs and layer content unchanged.
- Raster cover import replaces layers with none and sets the imported image as the full-surface background; the confirmation can cancel without changing the design.
- Importing JSON in the cover editor reads and replaces only `surfaces.cover`; importing in the back-cover editor reads and replaces only `surfaces["back-cover"]`. The opposite surface remains unchanged, whether present or absent in the file.
- Targeted component, model/schema, and PNG rendering tests pass.
