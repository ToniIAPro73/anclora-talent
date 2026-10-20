# Theme-aware control legibility — plan v1

1. Audit global theme and button tokens, duplicate local control families, and screen-level exceptions.
2. Add failing contracts for theme-specific primary/selected foregrounds and shared state behavior.
3. Define paired semantic tokens for button variants, toggles, focus, and disabled states in dark and light themes.
4. Route canonical and local control families through those shared tokens; remove conflicting hard-coded foreground/background declarations.
5. Run focused unit, type, lint, and contrast checks.
6. Use the required shared visual QA runtime for representative routes in both themes and responsive sizes; record findings and any inaccessible route states.
7. Update `docs/VALIDATION_CHECKLIST.md` with agent evidence and a manual review checklist for Toni.

## Risks

- Local CSS families may override global tokens later in the cascade; search and verify all explicit button selectors.
- Gradient contrast cannot be established from one endpoint; sample rendered pixels/text pairings in browser QA.
- External design-system selectors can override app rules if import order changes.

## Rollback

Revert the token and selector changes together. Keep the new spec and task log as the record of the accepted direction.
