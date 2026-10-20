# Cover and back-cover layer workspace — plan v1

1. Inspect current shared editor layout, layer panel behavior, and responsive breakpoints.
2. Add failing tests for the compact layer viewport, layer management dialog, and relocated canvas toolbar.
3. Add failing tests for organized control groups, active-state styling, dynamic dimensions, and evenly distributed background mode controls.
4. Move canvas label and toolbar into the left workspace below layers; constrain compact layer height to five rows.
5. Add an icon-only, keyboard-accessible layer manager and grouped toolbar styling for both themes.
6. Normalize background mode choices so labels fit the narrow inspector without clipping or wrapping.
7. Run focused component tests, type/lint checks, and shared visual QA for cover/back-cover at desktop, tablet, and mobile widths.
8. Record evidence and manual review steps in the validation checklist.

## Risks

- Rendering the layer list twice may duplicate DOM IDs or open layer action menus; use one mounted panel with dialog state or ensure unique IDs.
- A narrow screen cannot retain desktop's four-column geometry; keep existing stacked breakpoint behavior and place controls where they remain reachable.
