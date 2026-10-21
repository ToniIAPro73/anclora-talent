# Responsive font selector popover — spec v1

## Intent

Make the cover editor font selector compact and reliably visible across desktop, tablet, and mobile viewports, regardless of the editor's scroll position.

## Requirements

1. The selector popover uses compact typography, spacing, search, and category controls consistent with the cover properties panel.
2. Search and category controls remain visible; only the font results list scrolls.
3. The popover opens above or below the trigger according to available viewport space, choosing a side that keeps the full panel visible when possible.
4. The popover is repositioned when viewport size or page/ancestor scroll changes while open.
5. Popover width and horizontal placement remain within the viewport on narrow screens.
6. The selected font and existing search, category, keyboard, and selection behavior remain intact.

## Acceptance criteria

- At desktop, tablet, and mobile widths, the popover stays within viewport bounds.
- When the trigger is near the bottom edge, the popover opens upward; when near the top, it opens downward.
- On scroll and resize, the open popover recalculates its side and position.
- The result list is the sole vertically scrolling area; search and category controls stay visible.
