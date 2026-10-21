# Cover text size, transparent background, and image import semantics — plan v1

## Design

- Update `CompactNumberField` to keep a local text draft while focused, only commit finite values, and restore the committed value when an empty/invalid draft blurs. Add optional datalist suggestions and enable it only for font size.
- Add a `transparent` variant to `BackgroundSpec` and its Zod schema. Existing version 2 packages remain compatible because the new variant is additive.
- Leave Fabric's background unset for transparent surfaces; DOM preview already renders no background for non-solid/non-gradient backgrounds. Verify browser and server PNG output retain alpha.
- Add a “Sin fondo” background mode; selecting it changes only `surface.background`.
- Change raster “Importar portada/contraportada” to a single flattened background with an empty layer collection. Ask for replacement confirmation only when layers exist; retain existing cancellation behavior on invalid files.
- Keep JSON export as a two-surface package. Make import screen-aware: validate and replace only the active surface, accept a package containing only that active surface, and leave the companion surface untouched.
- Reuse the established compact Talent button classes for background image upload.

## Sequence

1. Add failing tests for editable font-size draft/presets, transparent schema/render/export, background-only image behavior, and raster import replacement/cancel.
2. Implement model, UI, and import changes.
3. Run focused tests and type/lint checks; verify PNG alpha and imports in the shared visual QA runtime with the dedicated account.
4. Update the validation checklist, commit, and push `development`; stop before promotion.
