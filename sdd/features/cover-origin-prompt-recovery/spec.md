# Cover origin prompt recovery

## Problem

The empty cover origin prompt offers source-page and new-design choices but no way to dismiss the prompt without choosing one. If PDF.js cannot parse the source PDF, the rejected rasterization promise escapes the click handler and can surface as a Next.js runtime error overlay.

## Requirements

- Provide an explicit action to continue into the editor without selecting an origin option.
- Explain what using the original page, editing over it, choosing a template, and starting blank do.
- Catch source-page rasterization failures, keep the prompt available, and show a localized recoverable error.
- Preserve the source document and existing behavior when PDF rasterization succeeds.

## Acceptance criteria

1. The prompt has a clearly named continue-without-choice action that opens the editor.
2. Each start choice explains its effect before the user selects it.
3. A rejected original-page action does not produce an unhandled rejection; a localized alert appears and the prompt remains usable for retry or dismissal.
4. Spanish and English copy are available.

## Scope

Cover Studio V2 empty-state prompt and localized copy. No source PDF or project data is modified by this change.
