# Plan

1. Add a failing component regression assertion for the canonical projection's editable overlay.
2. Replace the fully transparent overlay presentation with a transparent-glyph edit layer that exposes only caret and selection feedback while preserving canonical text rendering.
3. Add scoped CSS for caret and selection colors and document the layer contract in code.
4. Run focused tests, TypeScript/lint/build checks as applicable.
5. Re-run the authenticated ODT workflow and capture caret, selection, quote, attribution, toolbar, and save/reload evidence.
