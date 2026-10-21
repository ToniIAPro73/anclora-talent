# Cover properties panel density — spec v1

## Intent

Make the cover and back-cover properties panel compact and visually consistent with the left tool rail while keeping the default text controls visible without a vertical scrollbar at normal browser zoom.

## Requirements

1. The background import action says «Importar portada» on the cover and «Importar contraportada» on the back cover.
2. The properties heading and selected layer label share one compact row.
3. Inspector section labels and controls use the compact scale and active accent used by the left workspace controls.
4. Bold, italic, underline, horizontal alignment, and vertical alignment retain their independent pressed states and show the shared left accent when active.
5. Text content, typography, and position/size remain open by default; spacing and appearance remain collapsed. The default inspector content fits without vertical scrolling at the standard desktop viewport.
6. Expanding spacing or appearance keeps the inspector body scrollable when its content exceeds the available height.
7. The cover editor route does not retain the global legal footer below the full-height workspace, avoiding an unnecessary page-level scrollbar.

## Acceptance criteria

- Both surfaces show the correct import label.
- Selected layer and «Propiedades» occupy one row without clipping long layer names.
- Multiple independent typography toggles can remain active and display the left-rail selection treatment.
- At a 1440×900 desktop viewport and 100% browser zoom, default text controls including rotation are visible without an inspector or page-level scrollbar; the inspector remains scrollable when its content exceeds the available height.
