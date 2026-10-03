# Chapter editor visible edit surface

## Status

Draft for remediation of the authenticated chapter-editor QA finding.

## Problem

When a chapter has canonical page projections, the visible document is rendered from canonical HTML while the TipTap editor is mounted in a separate transparent overlay. The overlay receives pointer input and owns browser selection, but `opacity: 0` hides the caret and selection feedback from the writer.

## Requirements

1. The browser selection and caret owned by the active editor must be visibly discoverable on the same page content the writer clicked.
2. Selection highlighting must remain visible for mouse and keyboard selections.
3. The canonical page projection must remain the visual source for imported pagination and must not be duplicated by opaque editable text.
4. Toolbar commands must continue to operate on the live editor selection.
5. The edit surface must retain keyboard focus, pointer routing, and selection restoration across toolbar actions.
6. The behavior must be covered by component regression tests and authenticated browser evidence.

## Acceptance criteria

- A collapsed caret has a non-zero visible CSS caret and is visible after clicking title, paragraph, quote, and attribution content.
- A selected range has a visible selection highlight.
- Canonical imported text remains visually unchanged apart from caret/selection feedback.
- Existing toolbar actions and editor command tests remain green.
- The source ODT is not modified.
