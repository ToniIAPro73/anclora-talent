# Preview Modal Structure And Autofit Design

## Context

The preview modal currently shows too many nested vertical scroll areas, which breaks the feeling of a polished document preview. The chapter list / table of contents is also unreliable, and the preview does not consistently reflect the real book structure with cover, back cover, and chapter sequence.

The target behavior is a document preview that opens already composed like a finished book:

- default format: laptop
- default view: two pages
- default zoom: automatically fitted to the current viewport so the full spread is visible without internal page scrollbars

After that, the user may zoom in manually. In that case, vertical scrolling is acceptable only at the outer preview container level, never inside the individual pages.

## Goals

1. Open the preview modal in `laptop` format, `two-page` view, with automatic fit-to-viewport zoom.
2. Remove vertical scrolling from inside the rendered pages.
3. Ensure the preview represents the real book structure:
   - cover
   - front matter / index if present
   - chapters in real order
   - back cover
4. Make the chapter list / table of contents navigate correctly to the page corresponding to the real preview structure.
5. Keep zoom interactive after opening, while preserving a single outer document scroll.

## Non-Goals

- Redesigning the whole visual brand of the preview modal.
- Rebuilding the preview builder from scratch unless the current structure is unusable.
- Adding new preview modes beyond fixing current defaults and structure.

## Design

### 1. Default modal state

When the modal opens:

- `format = laptop`
- `spread mode = two pages`
- `zoom = auto-fit`

The auto-fit zoom must be computed from:

- viewport width
- viewport height
- visible chrome in the modal (toolbar, footer, sidebars)
- rendered width/height of a two-page laptop spread

The computed zoom must ensure the entire visible spread fits without page-internal scrollbars.

### 2. Scroll architecture

The preview must use a single main scroll container for the document area.

Allowed scroll behavior:

- outer preview area: may scroll vertically when the user zooms in
- table of contents sidebar: may scroll independently if needed

Forbidden scroll behavior:

- vertical scroll inside an individual page
- nested scroll regions inside the document spread itself

This means rendered pages must be visually clipped only by the outer preview area, not by their own `overflow-y-auto`.

### 3. Real document structure

The preview must render the real sequence of book surfaces:

1. Cover
2. Internal pages generated from imported/edited content
3. Back cover

If the project includes an index / table of contents chapter, it must appear in the right place in the page sequence and in the navigation list.

### 4. Chapter list / table of contents behavior

The table of contents must be derived from the same page structure used for rendering.

That means:

- chapter entries map to the actual page index in preview
- page numbers shown in the list match the rendered preview numbering
- clicking an entry scrolls or navigates to the correct page
- no duplicated, truncated, or structurally inconsistent chapter listing

### 5. Auto-fit behavior after resize

The modal should recalculate fit zoom on window resize only while the user has not manually changed the zoom.

Once the user manually adjusts zoom:

- preserve user zoom
- do not override it on subsequent resizes unless the modal is reopened

## Testing

### Modal defaults

- opens in laptop format
- opens in two-page view
- computes an initial zoom below or equal to 100% as needed to fit

### Scroll behavior

- rendered pages do not expose internal vertical scroll
- outer preview area can scroll when zoom is increased

### Structure

- preview includes cover and back cover
- chapter sequence matches the actual built preview order
- index chapter appears in the correct place if present

### Navigation

- table of contents page numbers match rendered preview pages
- clicking a chapter entry lands on the correct preview page

## Risks

- Auto-fit depends on measuring live container dimensions, so timing around modal open/render matters.
- If the preview builder and the chapter list currently derive from different page models, both must be unified to avoid more drift.
- Cover and back cover may need special handling in page numbering logic depending on whether current numbering is physical-page or content-page based.

## Recommendation

Implement in this order:

1. Fix modal defaults and auto-fit zoom.
2. Remove page-internal scroll and enforce a single outer document scroll.
3. Unify the table of contents with the same preview page model used for rendering.
4. Verify cover, chapter structure, and back cover ordering end-to-end.
