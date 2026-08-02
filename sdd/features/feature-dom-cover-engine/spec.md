# Feature: Motor de portada 100% DOM (Fase C) — CoverStudio unificado

## Objetivo

Rediseñar el editor de portada y contraportada eliminando el render de texto en canvas
(Fabric) tras el fallo histórico documentado en
`Archive/docs/estado-editor-avanzado-portada.md` (el título se recortaba visualmente:
"NUNCA M" en vez de "NUNCA MÁS EN LA SOMBRA", con el dato correcto persistido).

## Decisiones estructurales

### 1. Render de texto 100% DOM

- Todo el texto (título, subtítulo, autor, cuerpo, bio) se renderiza como elementos HTML
  absolutamente posicionados dentro del lienzo (`SurfaceCanvas`). El navegador hace el
  layout del texto: la capa declara `width` + `white-space: pre-wrap` + `overflow: visible`
  y **nunca** altura fija ni `overflow: hidden`, por lo que un texto largo envuelve y crece
  verticalmente — el recorte es imposible por construcción.
- Lo que ve el usuario ES lo que se exporta: el guardado captura ese mismo nodo con
  `html-to-image` (`toPng`, pixelRatio 2) y lo sube vía `renderCoverImageAction` /
  `renderBackCoverImageAction` (contrato de servidor intacto).
- Edición directa: doble clic sobre una capa la vuelve `contentEditable`; arrastrar la
  mueve (pointer events, coordenadas del lienzo lógico 400×600 escaladas por CSS).

### 2. Fabric fuera del motor de cubierta

- `src/lib/canvas-store.ts` (zustand sobre objetos Fabric) eliminado, junto con todo
  `src/components/projects/advanced-cover/` y `src/components/projects/advanced-back-cover/`.
- La dependencia `fabric` **se conserva** porque `advanced-chapter-editor/ChapterImageCanvas.tsx`
  (editor de imágenes inline de capítulo, fuera del alcance de la Fase C) la usa con
  `canvas-utils.ts` y `canvas-guides.ts`, que se mantienen sin tocar. Retirar `fabric` del
  `package.json` queda como fase posterior junto con la reescritura del editor de imágenes
  de capítulo.

### 3. Única fuente de verdad

- Un solo `SurfaceState` (`src/lib/projects/cover-surface.ts` + resolvers) compartido por
  portada y contraportada. El snapshot inicial lo construye
  `src/lib/projects/surface-snapshot.ts` (`createSurfaceSnapshotFromProject`, movido desde
  `advanced-cover/advanced-surface-utils.ts`).
- El draft ad hoc básico↔avanzado de `ProjectWorkspace` (`coverDraft`, `coverDraftProject`)
  se elimina: pasos 4 y 5 renderizan directamente `<CoverStudio surface="cover|back-cover">`.
- **Un solo editor con dos modos**: `CoverStudio` (`src/components/projects/cover-studio/`)
  - `simple`: plantilla guiada + inputs de campos + paleta/acento + fondo.
  - `advanced`: capas libres — selección, arrastre, edición inline, inspector tipográfico
    (`SurfaceInspector`: contenido, fuente Google Fonts vía `FontSelector` + `use-google-fonts`,
    tamaño, peso, estilo, alineación, interlineado, tracking, color, opacidad).
  - Ambos modos comparten el mismo estado React (`SurfaceState`), sin sincronización.
- `CoverForm`/`BackCoverForm` eliminados; las páginas standalone
  `/projects/[id]/cover` y `/projects/[id]/back-cover` también usan `CoverStudio`.

### 4. Geometría compartida con la exportación

- `COVER_SURFACE_CANVAS` (400×600) en `src/lib/projects/cover-layout.ts` es el espacio de
  coordenadas único; el lienzo se escala solo por CSS.
- `computeLayerStyle` + `layerStyleToCss`
  (`cover-studio/surface-layer-style.ts`) aplican exactamente las mismas convenciones que el
  renderer server-side de `export-surface-image.ts` (ancla `left/top`, `translate(-50%|-0, -50%)`,
  `width %`, tipografía), así el PNG del cliente y el re-render servidor coinciden.
- Geometría de impresión preparada para la fase posterior:
  `COVER_PRINT_GEOMETRY` (trim 140×210 mm, bleed 3 mm, margen seguro 10 mm) +
  `computeSpineWidthMm(pageCount)` + `computeFullCoverSpreadWidthMm(pageCount)`.

### 5. Plantillas

- `EditorialTemplate` gana `layerStyles` (preset tipográfico/composición por campo) en
  `cover-templates.ts` para las 7 plantillas de portada y las 7 de contraportada.
- `applySurfaceTemplate` (`cover-surface.ts`) ahora reconcilia capas: conserva la geometría
  del usuario, crea capas para campos recién visibles y funde los presets de la plantilla.
- El modo simple parte siempre de una plantilla (selector en el inspector); el paso 3 del
  workflow (`TemplateSelector`) sigue funcionando igual.

## Contrato de datos persistido

Sin cambios: `projects.cover` / `projects.backCover` (JSON con `surfaceState`), y las server
actions `saveProjectCoverAction`, `saveBackCoverAction`, `renderCoverImageAction`,
`renderBackCoverImageAction` reciben el mismo FormData de siempre. El preview del libro
(`preview-builder`, `PreviewModal`) y la cadena PDF/DOCX (`export-builder`,
`export-surface-image`) consumen los mismos resolvers.

## Regresión permanente

- Unit: `cover-studio/CoverStudio.test.tsx` y `surface-layer-style.test.ts` (contrato
  anti-recorte: `pre-wrap`, `overflow: visible`, sin `height`/`maxHeight`).
- E2E: `e2e/cover-studio.spec.ts` — con usuario real y proyecto "NUNCA MÁS EN LA SOMBRA",
  afirma en navegador real que el texto completo queda dentro del lienzo
  (`scrollWidth <= clientWidth` + line boxes dentro del canvas), en portada y contraportada,
  tema dark y light, modos simple y avanzado. Screenshot de verificación en
  `test-results/cover-studio-nunca-mas.png`.

## Limitaciones conocidas / fase posterior

- `fabric` sigue instalado solo para el editor de imágenes de capítulo.
- Undo/redo del editor avanzado viejo no se porta (el estado es un solo objeto React;
  candidato a historia con snapshots de `SurfaceState`).
- Las capas siguen ligadas a campos canónicos (title/subtitle/author/body/authorBio):
  es lo que la cadena de export server-side sabe renderizar.
- Lomo y bleed: geometría lista (`COVER_PRINT_GEOMETRY`), UI de cubierta completa pendiente.
