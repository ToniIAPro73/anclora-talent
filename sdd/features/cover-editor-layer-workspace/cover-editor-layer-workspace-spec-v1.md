# Cover and back-cover layer workspace — spec v1

## Intent

Give the cover and back-cover canvas more visual priority by moving its dimensions and editing tools into the existing left workspace, while keeping layer editing compact and discoverable.

## Requirements

1. Remove the dedicated canvas header row above the canvas.
2. Place the face-specific canvas label, pixel dimensions, and all canvas tool controls in the left workspace below the compact layer list.
3. In compact mode, show no more than five layer rows; reveal vertical scrolling only when the content exceeds that capacity.
4. Provide an accessible layer-management dialog containing the complete, interactive layer list, including existing visibility, lock, rename, duplicate, delete, reorder, grouping, and selection behavior.
5. Keep the layer list and toolbar usable for both cover and back-cover surfaces and preserve existing keyboard behavior.
6. On narrow screens, retain a usable canvas-first layout and avoid horizontal overflow or a permanently tall left rail.
7. The layer expansion action is an icon-only detail control in the layer card header; it must not repeat the visible “Layers” heading.
8. Group canvas view/guide controls separately from object-alignment controls, with clear visible and accessible group labels.
9. Selected left-rail tools and active canvas toggles share a restrained blue accent edge that identifies state without filling the whole control with a strong color.
10. The canvas size label always reflects the current surface dimensions.
11. Background type choices use equal-width, concise labels that remain on one line in the properties panel; the background, text, shape, line, and image property panels retain their existing editing actions.
12. The applied editorial template is represented by its composition on the canvas; do not render a second active-template thumbnail/card in the side workspace. Keep the top template selector and the existing confirmation before replacing a non-empty composition.
13. Text formatting controls remain usable at narrow inspector widths: style, horizontal alignment, and vertical alignment groups must each fit their own row without wrapping controls into uneven lines.

## Acceptance criteria

- The canvas has no title/tool row above it; label and tools appear beneath the layer panel on the left.
- The compact list displays at most five rows and scrolls when there are more; shorter lists do not show a scroll region.
- The layer dialog exposes every layer and actions update the same surface as the canvas.
- All canvas controls retain their accessible names, pressed/disabled states, and behavior.
- The layer expansion control is icon-only, opens the manager, traps keyboard focus, closes on Escape, and returns focus to its trigger.
- Background modes fit the properties panel without clipped or split labels.
- Applying a template updates the canvas while no duplicate active-template preview is shown in the left workspace; switching a non-empty design still asks for confirmation.
- Text style and alignment controls remain evenly sized and readable in a narrow properties panel.
- Cover and back-cover layouts remain responsive in both themes.
