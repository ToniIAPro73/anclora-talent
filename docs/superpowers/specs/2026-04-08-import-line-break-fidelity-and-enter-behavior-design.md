# Import Line Break Fidelity And Enter Behavior Design

## Context

The multipage editor now paginates correctly, but a new regression appears when the user presses `Enter`: automatic page-break behavior can propagate across the visible chapter instead of only affecting the local flow around the cursor.

The import pipeline also needs higher fidelity. The current normalization keeps useful structure, but it still collapses or rewrites too many original line breaks, especially for `docx`-derived content. The target behavior is to preserve intentional line breaks from source documents as faithfully as possible across supported import formats: `docx`, `Google Docs`, `markdown`, `txt`, and `pdf`.

## Goals

1. Pressing `Enter` inside the editor must create a normal paragraph break at the cursor without introducing repeated page-break artifacts across the chapter.
2. Automatic page breaks must remain recalculated, but only as a consequence of real overflow.
3. Imported documents must preserve explicit line breaks from the source format whenever the source format exposes them reliably.
4. The imported HTML should distinguish:
   - paragraph boundaries
   - soft line breaks within a paragraph
   - page breaks

## Non-Goals

- Rebuilding the full import architecture.
- Perfect visual fidelity for every PDF line break. PDF imports require heuristics because visual line wrapping is not always semantic.
- Introducing a new user-facing import mode toggle in this round.

## Design

### 1. Editor `Enter` behavior

The shared-flow editor must treat `Enter` as a local structural change:

- insert a paragraph break or block split at the current selection
- re-run overflow reconciliation
- preserve manual page breaks
- update automatic page breaks only where overflow genuinely changes

The reconciler must not amplify a single edit into repeated visible rule separators across all rendered pages.

### 2. Import fidelity by format

#### `docx` and Google Docs

- Preserve paragraph boundaries from the source document.
- Preserve explicit soft line breaks as `<br>`.
- Keep headings, lists, quotes, and other structural blocks where they are already detectable.
- Avoid flattening multiple source lines into a single paragraph when the source represented them as distinct lines inside one block.

Google Docs content should follow the same treatment because exported/imported structure is effectively `docx`-like when available as rich HTML or converted Word content.

#### `markdown`

- Preserve explicit line breaks and paragraph boundaries.
- Convert markdown hard breaks into `<br>` rather than silently collapsing them.
- Preserve headings and lists through the existing structure parser.

#### `txt`

- Treat each explicit line as intentional by default.
- Preserve blank-line paragraph boundaries.
- Preserve single line breaks as `<br>` unless a stronger structural heuristic applies later.

#### `pdf`

- Preserve blank-line paragraph boundaries.
- Preserve only line breaks that look intentional or structural.
- Merge likely visual wraps caused only by PDF page width.

This means PDF remains heuristic-based, while the other formats move closer to source-exact fidelity.

### 3. HTML normalization rules

Normalization must stop destroying meaningful soft breaks.

The resulting HTML should:

- keep `<br>` where the source explicitly contained a line break
- keep `<p>` for paragraph boundaries
- keep `<hr data-page-break=\"manual|auto\">` for page semantics
- avoid collapsing all multi-line text into a single whitespace-normalized paragraph

## Data Flow

1. Source document is parsed per format.
2. Raw text/HTML is converted into parsed blocks without losing explicit line-break intent.
3. Chapter seeds are built with blocks that preserve:
   - headings
   - paragraphs
   - lists
   - quotes
   - inline `<br>` where applicable
4. Editor renders those blocks in the shared multipage flow.
5. When the user edits:
   - content changes locally
   - overflow reconciliation updates automatic page breaks
   - no synthetic repeated separators are introduced by `Enter`

## Testing

### Editor regression

- Failing test first: pressing `Enter` in one page must not create repeated visible separators across the chapter.
- Verify manual page breaks remain stable.
- Verify automatic page breaks only change when overflow changes.

### Import fidelity

- `docx`/rich HTML: explicit source line breaks survive as `<br>`
- `markdown`: hard breaks survive as `<br>`
- `txt`: explicit single-line breaks survive in imported HTML
- `pdf`: paragraph boundaries remain stable and obvious visual-wrap lines are merged conservatively

## Risks

- Higher import fidelity can make some imported content look less “clean” because the editor will now reflect the original author’s line choices more literally.
- PDF heuristics can still be imperfect; this is expected and acceptable for this round.
- Preserving more `<br>` nodes means downstream normalization and chapter rendering must avoid re-collapsing them.

## Recommendation

Implement in this order:

1. Fix the `Enter` regression with a failing editor test.
2. Preserve explicit line breaks in the import pipeline per format.
3. Add targeted regression coverage for `docx`/rich HTML, `markdown`, `txt`, and `pdf`.
