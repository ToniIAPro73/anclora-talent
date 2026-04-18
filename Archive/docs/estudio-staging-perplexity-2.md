Te propongo un plan concreto para la **opción 1: que el preview use el mismo layout de columnas que el editor**, de forma que el contenido de cada página coincida de verdad con el editor de capítulos.

***

## Objetivo técnico

- Ahora mismo:
    - **Editor** → layout real con columnas CSS + `<hr data-page-break>` (`.multipage-editor-flow`).
    - **Preview** → páginas cortadas por `paginateContent` y pintadas una a una (`.preview-page`).
- Queremos:
    - Que el **preview de contenido** use también columnas CSS y los mismos `<hr data-page-break>` que el editor.
    - Que el número de página avance simplemente desplazando ese flujo de columnas, igual que en el editor, en vez de cortar HTML a mano.

***

## Paso 1: Extraer el motor multipágina a un componente reutilizable

En `AdvancedRichTextEditor` ya tienes todo el layout multipágina: estilos, columnas, `multipage-editor-flow`, cálculo de `flowWidth`, `flowOffset`, `visiblePageIndices`, medición de páginas (`measureRenderablePages`, `onPageCountChange`).

La idea es extraer todo ese bloque a un nuevo componente, por ejemplo:

```tsx
// src/components/projects/MultipageFlow.tsx
type MultipageFlowProps = {
  html: string;
  config: PaginationConfig;      // el mismo que usas ahora
  currentPage: number;
  viewMode: 'single' | 'double'; // o 'spread' para el preview
  margins: { top: number; bottom: number; left: number; right: number };
  onPageCountChange?: (pages: number) => void;
};
```

Internamente, `MultipageFlow`:

- Calcula `pageWidth`, `pageHeight`, `contentWidth`, `contentHeight`, `columnGap`, `viewportWidth`, `flowWidth`, `flowOffset`, `visiblePageIndices` exactamente igual que ahora en el editor.
- Pinta los **frames** de página (`multipage-page-frame`, `multipage-page-inner`) en una grid, igual que en el editor.
- Dentro pinta el div con columnas:

```tsx
<div
  ref={multipageFlowRef}
  className="multipage-editor-flow ..."
>
  <div
    className="multipage-editor-flow-track"
    style={{ transform: `translateX(-${flowOffset}px)` }}
  >
    <div
      className="ProseMirror"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  </div>
</div>
```

reutilizando los mismos estilos CSS que ya defines para `.multipage-editor-flow` y `.ProseMirror` (columnas, `column-width`, `column-gap`, etc.).
- Usa el mismo `measureRenderablePages` que ya tienes para calcular `measuredPages` y llamar a `onPageCountChange` con el número real de columnas ocupadas.

En el editor seguirías usando un layout casi idéntico, solo que en vez de `dangerouslySetInnerHTML` usas `<EditorContent editor={editor} />`; el componente genérico te sirve de referencia para que el CSS y la geometría sean iguales en ambos sitios.

***

## Paso 2: Usar el mismo `PaginationConfig` en editor y preview

En `PreviewModal` ya creas un `paginationConfig` con:

```ts
const paginationConfig = useMemo(
  () =>
    buildPaginationConfig(format, {
      fontSize: preferences.fontSize,
      margins: preferences.margins,
    }),
  [format, preferences.fontSize, preferences.margins],
);
```

y en el editor calculas un config equivalente con `DEVICE_PAGINATION_CONFIGS[previewFormat]` + overrides.

La idea es que:

- **Editor** y **PreviewModal** reciban el mismo `paginationConfig` (o formato + overrides) desde un sitio común (preferences/context) y no recalculen nada distinto.
- Así, cuando cambies dispositivo, márgenes o tamaño de fuente, ambos cambian en lockstep.

En código práctico de transición, puedes:

- Mantener `buildPaginationConfig` como hasta ahora.
- Asegurarte de que `ChapterEditorFullscreen` y `PreviewModal` usan el mismo `preferences` (ya lo hacen) y que no hay overrides adicionales divergentes.

***

## Paso 3: Cambiar el preview de contenido para usar columnas en vez de `paginateContent`

Ahora mismo `buildPreviewPages` hace:

```ts
const reconciledChapterHtml = reconcileOverflowBreaks(chapter.html, config);
const chapterPageHtmls = paginateContent(reconciledChapterHtml, config)
  .filter(page => hasRenderablePageContent(page.html))
  .map(page => page.html);
```

Y cada `PreviewPage` de tipo `content` se renderiza con:

```tsx
<div style={pageStyle} className="preview-page ...">
  <style>{`
    .preview-page { font-size: ${config.fontSize}px; ... }
    ...
  `}</style>
  <div dangerouslySetInnerHTML={{ __html: page.content || '' }} />
</div>
```

La modificación de arquitectura sería:

1. **Dejar de cortar el HTML por páginas en el preview.**
    - Para contenido, no uses `chapterPageHtmls` ni `page.content`.
    - En su lugar, construye un **único HTML reconciliado** para todos los capítulos, algo como:

```ts
const contentHtml = chapterSections
  .map(ch => reconcileOverflowBreaks(ch.html, config))
  .join('<hr data-page-break="manual" />'); // separador entre capítulos
```

Esto lo puedes hacer en `PreviewModal` o en un helper específico, sin pasar por `paginateContent`.
2. **Reemplazar los `PreviewPage` de contenido por un único `MultipageFlow`.**

En la parte central de `PreviewModal`, en la sección donde ahora calculas `visiblePages` y pintas cada página, harías algo así:

```tsx
// currentPage aquí sería el índice de página de contenido (sin contar portada)
<MultipageFlow
  html={contentHtml}
  config={paginationConfig}
  currentPage={currentPageWithoutCover}
  viewMode={viewMode === 'spread' ? 'double' : 'single'}
  margins={preferences.margins}
  onPageCountChange={setTotalContentPages}
/>
```

    - `MultipageFlow` usará exactamente el mismo CSS de columnas, `break-after: column` en los `<hr data-page-break>` y misma geometría que el editor.
    - El usuario verá exactamente las mismas páginas que ve en el editor, incluyendo dónde se corta un párrafo, listas, imágenes, etc.
3. **Portada y contraportada siguen siendo páginas independientes.**
    - El layout de cover/back-cover que ya tienes (no columnar, con imágenes y títulos) se mantiene tal cual.
    - A efectos de numeración, tendrás:
        - Página 1 → cover.
        - Páginas 2…(1 + totalContentPages) → contenido dentro de `MultipageFlow`.
        - Última página → back-cover (si existe).

***

## Paso 4: Sincronizar navegación y numeración

En `PreviewModal` ya gestionas:

- `currentPage`, `viewMode` ('single' | 'spread') y `totalPages`, con lógica especial para que en spread, desde portada, pases a `(0) -> (1,2) -> (3,4)`, etc.

Con el nuevo modelo:

1. **Separar índice lógico en:**
    - `coverPageIndex = 0`.
    - `firstContentPageIndex = 1`.
    - `lastContentPageIndex = firstContentPageIndex + totalContentPages - 1`.
    - `backCoverPageIndex = lastContentPageIndex + 1` (si hay contraportada).
2. **Cuando renders:**
    - Si `currentPage === coverPageIndex` → render cover como hasta ahora.
    - Si `currentPage === backCoverPageIndex` → render back-cover.
    - Si `firstContentPageIndex ≤ currentPage ≤ lastContentPageIndex`:
        - Calcula `contentPageIndex = currentPage - firstContentPageIndex`.
        - Pásalo a `MultipageFlow.currentPage` como índice de columna.
        - Deja que `MultipageFlow` se encargue de mostrar una o dos páginas visibles según `viewMode`.
3. **`totalPages` = `1 (cover) + totalContentPages + (backCover ? 1 : 0)`**.
`totalContentPages` te lo devuelve `MultipageFlow` vía `onPageCountChange`.

Con esto, la **paginación lógica** del preview y el **layout visual** están gobernados por el mismo motor que el editor.

***

## Paso 5: TOC y salto a capítulos

Tu TOC actual se basa en las `PreviewPage` generadas por `buildPreviewPages`, usando el primer `page` de cada `chapterId` para saber en qué página empieza.

Como en este enfoque ya no tienes un `PreviewPage` por contenido, puedes:

- Mantener `buildPreviewPages` solo como herramienta para calcular el **primer número de página de cada capítulo**, ignorando su `content`.
- O mejor aún, reutilizar `metrics.ts` (`computeChapterPageMetrics`) para saber cuántas páginas ocupa cada capítulo en el formato actual, sumarlas y así obtener el índice inicial de cada capítulo.

Ejemplo simple:

- Calculas `pagesByChapter` en el formato activo.
- Haces un acumulado:
    - Capítulo 1 → empieza en página 2.
    - Capítulo 2 → empieza en página `2 + pagesChapter1`.
    - etc.
- Esos índices los usas para que al pulsar un capítulo en el sidebar saltes a `currentPage = índice de inicio de ese capítulo`.

No afecta al layout visual (que ya lo gobierna `MultipageFlow`); solo mejora la precisión del TOC.

***

## Resultado

Aplicando estos pasos:

- El **contenido de la página N en el preview será el mismo html que ocupa la columna N en el editor**, porque:
    - Misma `PaginationConfig`.
    - Mismas columnas CSS (`column-width`, `column-gap`, `break-after: column`).
    - Misma lógica de `<hr data-page-break="manual/auto">` vía `reconcileOverflowBreaks`.
- `paginateContent` queda relegado a:
    - Cálculos server‑side/fallback.
    - Métricas analíticas (como las de `metrics.ts`), no al layout visual que ve el usuario.

Si quieres, en el siguiente mensaje puedo proponerte un pseudo‑diff más concreto (nombres de ficheros y bloques a mover) para implementar `MultipageFlow` y enchufarlo en `PreviewModal` paso a paso.

