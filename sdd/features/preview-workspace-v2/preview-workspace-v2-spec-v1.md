# Preview Workspace v2 — Specification v1

## Scope

Replace Step 5 (`Vista previa`) — today a small embedded card that launches a
fullscreen `PreviewModal` — with a single editorial validation workspace that
follows `docs/mockups/workspace-system-v1/10-preview-v1.png`:

```
header + 8-step stepper (shared, unchanged)
┌ pages rail ┬ toolbar + preview stage ┬ composition panel ┐
```

Step 5 validates; Steps 1–4 create/edit; Step 8 exports. Preview never edits.

## Source of truth

Step 5 consumes the canonical composition only: `composeProjectPreview` /
`buildPreviewPages` (+ `MultipageFlow` for the flowed page surface) and the
canonical `DesignSurface` cover/back-cover renderer (`DesignSurfaceStaticPreview`).
No second paginator, no simplified HTML renderer, no stored copy of the cover.
The preview is a projection: it never writes chapters, `sourcePageMap`, covers
or composition.

## Acceptance criteria

1. Entering Step 5 opens the workspace directly (no launcher, no modal) with the
   shared header and stepper; the legacy "Progreso / Paso anterior / Siguiente
   paso" rail is not rendered on this step.
2. Toolbar: mode switch `Documento | Pliego | Portada`, page navigator
   (`‹ Página N de M ›`, direct input), zoom (− % +, bounds 50–150), `Ajustar`,
   fullscreen, `Exportar` (hands off to Step 8; no export logic here).
3. Modes. `Documento`: one page at a time. `Pliego`: facing pages with correct
   recto/verso parity (cover and back cover alone; printed even page on the left),
   available where the destination has spreads (print, desktop). `Portada`: focused
   front/back cover review with a `Portada | Contraportada` selector.
4. Auto-fit on entry and on resize/mode/destination change: the whole page or
   spread is visible without vertical scrolling. Manual zoom afterwards may scroll.
5. Left rail: lazily rendered miniatures of the real canonical pages (cover,
   preliminary/content pages, back cover), numbered with the printed number;
   surfaces are labelled `Portada`/`Contraportada`, never numbered as manuscript
   pages. Active page highlighted, `aria-current`, click navigates.
6. Right panel `Composición`: reading destination (Impresión, Escritorio, Tableta,
   Lector electrónico), format, effective margins (read-only), page metrics
   (total, content, preliminary, cover/back cover) derived from the composition,
   and preflight.
7. Destination semantics. Reflowable documents are recomposed with the
   destination's page geometry/typography. Source-fidelity documents (valid
   `sourcePageMap`) keep the source pagination and geometry; the destination only
   changes the viewing frame and a notice says so. Switching destination never
   mutates chapters, source pagination, cover or back cover.
8. Preflight shows only checks that really run (fonts, images, metadata,
   composition violations from the canonical engine). Checks with no analyzer are
   shown as `No comprobado`. Findings anchored to a page navigate to it.
9. Keyboard: ArrowLeft/ArrowRight/Home/End; all controls tabbable; ARIA labels,
   `aria-current`, `aria-pressed`, `aria-selected`; reduced-motion respected.
10. ES/EN strings with parity. Responsive: three columns on large desktop,
    narrower/collapsible rails on medium, drawers on small; no horizontal
    page overflow.
11. No page-curl or theatrical animation.

## Out of scope

Mobile/smartphone destination (kept out of the core UX), print bleed/trim
analysis, any export behaviour, persistence of the selected page.

## Data and runtime

No schema/migration. Preview UI state (mode, destination, zoom) is local UI state;
`mode` and `destination` persist per viewer in `localStorage`. Local PostgreSQL
runtime; branch `development`; no promotion.
