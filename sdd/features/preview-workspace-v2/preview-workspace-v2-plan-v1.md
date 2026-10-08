# Preview Workspace v2 — Plan v1

## Audit result

| Item | Verdict |
| --- | --- |
| `PreviewCanvas` | Launcher card → remove (Step 5 mounts the workspace) |
| `PreviewModal` | Fullscreen modal owning composition, device, zoom, paging → replaced by `PreviewWorkspace`; `PageRenderer` extracted and kept |
| `PreviewDeviceSelector` | Third copy of the device state → remove |
| `MultipageFlow` | Canonical flowed page surface, reused as is |
| `composeProjectPreview` / `buildPreviewPages` / `buildComposedFlowHtml` | Canonical composition, reused |
| `device-configs.ts` | Reused; device presets finally drive page geometry for reflowable documents (previously overridden by source geometry for every device) |
| `DesignSurfaceStaticPreview` | Canonical cover/back-cover renderer, reused (main stage and thumbnails) |
| `DocumentHealthPanel` / `preflight()` / `useDocumentComposition` | Existing violation/preflight engine, reused for the right panel |
| `/projects/[id]/preview` route | Mounts the workspace standalone (same component) |

## Architecture

- `src/lib/preview/preview-workspace.ts` — pure model: destinations, geometry
  resolution, logical page list, spread pairing, fit scale, metrics, preflight
  rows. Fully unit-tested.
- `src/components/projects/preview-workspace/` — `PreviewWorkspace` (state +
  layout), `PreviewToolbar`, `PreviewPageRail` (lazy thumbnails),
  `PreviewStage` (flow + surfaces + device frame), `PreviewCompositionPanel`.
- `PreviewSurfacePage.tsx` — extracted `PageRenderer` for cover/back cover.
- State is one reducer-like set in `PreviewWorkspace`; no per-child duplicates.

## Order

1. Pure model + tests. 2. Components + CSS. 3. i18n ES/EN. 4. Mount in
`ProjectWorkspace` (no rail on step 5) and the standalone route. 5. Remove
legacy files/tests, update e2e. 6. Focused Playwright + gates.
