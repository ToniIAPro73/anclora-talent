# Responsive font selector popover — plan v1

1. Add focused regression tests for compact control sizing, edge-aware placement, and repositioning after scroll/resize.
2. Refactor viewport geometry into one positioning function that accounts for panel chrome, safe margins, and available height.
3. Keep search/category chrome fixed and constrain scrolling to the result list.
4. Validate the focused tests, TypeScript, lint, and visual behavior in the shared QA browser at desktop, tablet, and mobile widths.
