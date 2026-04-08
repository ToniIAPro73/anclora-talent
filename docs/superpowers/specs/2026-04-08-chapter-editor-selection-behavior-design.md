# Chapter Editor Selection Behavior Design

## Context

The advanced chapter editor currently mixes two inconsistent behaviors:

- some controls act only on explicit selections
- other controls still affect the current cursor position or active block even when the user is not intentionally targeting text

This creates accidental formatting changes, especially in empty areas, and makes the toolbar feel unreliable.

The current toolbar also has two UX issues tied to the same surface:

- the margins dropdown is visually clipped and does not fully fit in the available space
- the font-size and text-color controls are too limited for editorial work

## Goal

Make chapter-editor formatting predictable and intentional:

- formatting buttons must never apply changes in an empty area
- explicit selections keep highest priority
- when there is no explicit selection but the cursor is inside text, the editor must infer the correct target
- margins remain a global chapter/page setting, not an inline text-formatting operation

## Scope

In scope:

- advanced chapter editor toolbar behavior
- target inference for inline and block formatting actions
- margins dropdown usability fix
- richer font-size scale
- richer text-color palette
- tests for the new interaction rules where practical

Out of scope:

- redesigning the editor layout
- adding a freeform color picker
- paragraph-level margin editing
- changing preview pagination semantics beyond what current global margin settings already influence
- changing image insertion, page-break insertion, undo/redo, device switch, or view-mode semantics

## Functional Rules

### 1. Priority of target resolution

Every toolbar action must resolve its target using this order:

1. If there is an explicit selection, apply to that selection.
2. If there is no explicit selection and the cursor is inside text, infer a target from the cursor context.
3. If there is no explicit selection and the cursor is in an empty area or empty paragraph, do nothing.

### 2. Inline formatting behavior

The following controls are inline operations:

- font family
- font size
- text color
- bold
- italic
- strikethrough

Behavior:

- with explicit selection: affect the selected range
- with collapsed selection inside a word: affect the whole current word
- with collapsed selection inside punctuation or whitespace only: do nothing
- with collapsed selection in an empty paragraph: do nothing

The editor must not leave a pending mark active at the cursor when no real target was resolved.

### 3. Block formatting behavior

The following controls are block operations:

- H1
- H2
- H3
- align left
- align center
- align right
- justify

Behavior:

- with explicit selection: affect the blocks intersected by the selection according to current Tiptap behavior
- with collapsed selection inside a paragraph that contains text: affect the current paragraph/block
- with collapsed selection in an empty paragraph: do nothing

For headings, applying the action with a collapsed selection inside a populated paragraph upgrades or toggles the current paragraph block. It must not create an empty heading in a blank line.

### 4. Controls that remain global or always available

These controls remain outside the text-targeting rule:

- margins selector: global to chapter/page preferences
- device switcher
- single/double page mode
- image insertion
- page break insertion
- undo
- redo

Margins must continue updating preview/page estimation globally for the current editing context, not only a selected paragraph.

## UX Changes

### 1. Toolbar feedback

The toolbar should communicate intent through enablement and behavior:

- inline and block buttons stay clickable when a valid inferred target exists
- if the cursor is in an empty area and there is no selection, the relevant formatting buttons become disabled
- titles/tooltips should reflect why a button is unavailable when practical

Active-state detection should still reflect current text or block context without implying that empty-space formatting is possible.

### 2. Font-size selector

Replace the current short scale with a broader editorial scale:

- 10px
- 11px
- 12px
- 14px
- 16px
- 18px
- 20px
- 24px
- 28px
- 32px
- 36px
- 48px

The selector must still support persistence of the last chosen font size in user preferences.

### 3. Text-color palette

Extend the palette with more useful editorial options while keeping a premium, curated set rather than a fully open picker.

The expanded palette should include:

- default/inherit
- stronger neutral light
- softer neutral light
- cool gray-blue
- dark ink-style tone where readable
- premium gold variants
- blue variants
- mint/teal variants
- warm coral/rose variants
- amber variants

The palette should remain visually grouped and compact enough to scan quickly.

### 4. Margins dropdown

The margins dropdown must be reworked so it is fully visible in the editor shell:

- larger width
- larger max height
- internal scroll when needed
- safer positioning and layering so it does not clip against the editor container
- labels and controls remain readable without crowding

## Technical Design

### 1. Shared target-resolution helpers

The editor toolbar should stop calling raw formatting commands directly for text-sensitive actions.

Instead, the editor should introduce helper functions with two responsibilities:

- resolve word-or-selection target for inline actions
- resolve paragraph-or-selection target for block actions

Expected helper behavior:

- inspect current selection from `editor.state.selection`
- if non-empty, use the current chain normally
- if empty, inspect the current textblock and derive boundaries for the current word or block
- only run the command if a valid target exists

This keeps behavior centralized and prevents each button from implementing its own selection logic.

### 2. Inline word targeting

Word targeting should:

- inspect the current text node around the cursor
- expand left and right until word boundaries are found
- create a temporary text selection for that word
- run the desired command on that inferred range

Boundaries should treat plain spaces and common punctuation as separators. If the cursor is not actually inside a word token, no command should run.

### 3. Block targeting

Paragraph/block targeting should:

- identify the current textblock from the resolved position
- verify the block contains non-whitespace text
- run the heading/alignment command against that block

If the block is empty, the command should be ignored.

### 4. Extension hardening

`font-size-extension.ts` should be hardened so it does not rely on Tiptap’s default “apply to current position” behavior for this UX contract.

The toolbar helpers should be the main guardrail, but the extension should avoid encouraging collapsed-cursor formatting semantics in comments or implementation.

## Testing Strategy

Add focused tests around the new targeting contract where feasible:

- inline formatting applies to explicit selection
- inline formatting applies to current word when cursor is inside text and no selection exists
- inline formatting does nothing in empty paragraph / whitespace-only context
- block formatting applies to current paragraph when cursor is inside populated text
- block formatting does nothing in empty paragraph
- margins dropdown renders fully scrollable and does not regress basic interaction

If full DOM interaction coverage is too expensive in the current test harness, isolate target-resolution helpers and test them directly, then keep one or two integration-level checks for toolbar behavior.

## Risks

- word-boundary logic can feel wrong around punctuation, apostrophes, or mixed-language text if implemented too simplistically
- toolbar active states can drift from applied behavior if command resolution and UI-state checks are not aligned
- dropdown layering fixes can introduce overlap issues with fullscreen/modal contexts if z-index values are not verified end-to-end

## Recommendation

Implement the behavior through centralized target-resolution helpers inside the advanced editor toolbar, keep margins global, and expand only curated size/color options.

This reaches the requested UX without changing the document model or introducing a heavier editor-state abstraction.
