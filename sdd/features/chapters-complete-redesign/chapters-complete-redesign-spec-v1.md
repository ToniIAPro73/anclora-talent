# Chapters complete redesign — specification v1

## Scope

Replace the current Step 2 presentation with the approved chapter-management
workspace and focused single-chapter editor while preserving the existing
document model, server actions, authentication boundaries, TipTap editor,
save semantics, and canonical workflow stepper.

## Visual sources

- `docs/mockups/workspace-system-v1/07-chapters-v1.png`
- `docs/mockups/workspace-system-v1/07b-chapter-editor-v1.png`

## Acceptance criteria

1. Step 2 renders a responsive three-panel workspace: real chapter list,
   selected chapter overview, and selected chapter properties/health.
2. Existing add, import, select, reorder, delete, pagination sync, and editor
   flows remain functional. Unsupported mockup-only fields are not persisted.
3. Opening a chapter enters a focused editor with real content, compact context,
   previous/next navigation, existing toolbar capabilities, and return-to-
   Chapters behavior.
4. All touched controls use the shared Anclora button system and existing
   theme/language providers. No chapter-specific button variant is introduced.
5. Dark and light themes, Spanish and English labels, keyboard focus, and
   responsive layouts remain usable without global horizontal overflow.
6. TypeScript, unit tests, lint, build, and visual browser QA are run before
   delivery.

## Explicitly unsupported concepts

The current `DocumentChapter` model has no persisted subtitle, notes, status,
health, or chapter metadata fields. The redesign may show honest derived
information and editable title only; mockup-only fields must not be fabricated.
