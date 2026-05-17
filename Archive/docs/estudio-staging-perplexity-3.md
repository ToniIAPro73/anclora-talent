Te dejo la **fase A** bien acotada: solo tocar `PreviewModal` para que el contenido use el flujo multipágina de columnas, sin tocar aún el editor.

Voy en formato pasos concretos (no patch exacto, pero casi copy‑paste).

***

## 1) Crear `MultipageFlow` simplificado (solo para preview)

Primero una versión mínima, solo para el preview. Luego, si quieres, la generalizas y la reutilizas en el editor.

**Nuevo fichero** `src/components/projects/MultipageFlow.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { PaginationConfig } from '@/lib/preview/device-configs';

type MultipageFlowProps = {
  html: string;
  config: PaginationConfig;
  currentPage: number;              // índice 0‑based dentro del contenido (sin portada)
  viewMode: 'single' | 'spread';    // usamos mismo naming que PreviewModal
  margins: { top: number; bottom: number; left: number; right: number };
  onPageCountChange?: (pages: number) => void;
};

export function MultipageFlow({
  html,
  config,
  currentPage,
  viewMode,
  margins,
  onPageCountChange,
}: MultipageFlowProps) {
  const multipageFlowRef = useRef<HTMLDivElement>(null);

  const pageWidth = config.pageWidth;
  const pageHeight = config.pageHeight;
  const pageGap = 32;
  const contentWidth = Math.max(120, pageWidth - margins.left - margins.right);
  const contentHeight = Math.max(120, pageHeight - margins.top - margins.bottom);
  const columnGap = pageGap + margins.left + margins.right;

  // NOTA: totalPages viene de medir columnas. De inicio asumimos 1.
  const totalPagesRef = useRef(1);

  const spreadStartPage =
    viewMode === 'spread' ? Math.max(0, currentPage - (currentPage % 2)) : currentPage;
  const showSecondPage = viewMode === 'spread' && spreadStartPage + 1 < totalPagesRef.current;

  const viewportWidth = showSecondPage ? pageWidth * 2 + pageGap : pageWidth;
  const flowWidth =
    contentWidth * totalPagesRef.current +
    columnGap * Math.max(totalPagesRef.current - 1, 0);
  const flowOffset = spreadStartPage * (pageWidth + pageGap);

  const visiblePageIndices = Array.from(
    { length: showSecondPage ? 2 : 1 },
    (_, index) => spreadStartPage + index,
  ).filter((pageIndex) => pageIndex < totalPagesRef.current);

  const measureRenderablePages = useCallback(() => {
    if (!multipageFlowRef.current || !onPageCountChange) return;

    const root = multipageFlowRef.current.querySelector('.ProseMirror') as HTMLElement | null;
    if (!root) return;

    const rootRect = root.getBoundingClientRect();
    const children = Array.from(root.children) as HTMLElement[];

    const occupiedWidth = children.reduce((maxRight, child) => {
      const rects = Array.from(child.getClientRects());
      if (rects.length === 0) return maxRight;

      const childRight = Math.max(
        ...rects.map((rect) => Math.max(0, rect.right - rootRect.left)),
      );
      return Math.max(maxRight, childRight);
    }, 0);

    const measuredPages = Math.max(
      1,
      Math.ceil((occupiedWidth + 1) / (contentWidth + columnGap)),
    );

    totalPagesRef.current = measuredPages;
    onPageCountChange(measuredPages);
  }, [columnGap, contentWidth, onPageCountChange]);

  useEffect(() => {
    measureRenderablePages();
    window.addEventListener('resize', measureRenderablePages);
    return () => window.removeEventListener('resize', measureRenderablePages);
  }, [measureRenderablePages, html, config]);

  const pagePaddingStyle = {
    paddingTop: `${margins.top}px`,
    paddingBottom: `${margins.bottom}px`,
    paddingLeft: `${margins.left}px`,
    paddingRight: `${margins.right}px`,
  };

  return (
    <div
      className="relative mx-auto overflow-hidden"
      style={{ width: `${viewportWidth}px`, minHeight: `${pageHeight}px` }}
    >
      <style>{`
        .multipage-editor-flow {
          position: absolute;
          top: ${margins.top}px;
          left: ${margins.left}px;
          width: calc(100% - ${margins.left + margins.right}px);
          height: ${contentHeight}px;
          overflow: hidden;
        }
        .multipage-editor-flow-track {
          height: ${contentHeight}px;
          transition: transform 0.25s ease;
        }
        .multipage-editor-flow .ProseMirror {
          height: ${contentHeight}px;
          width: ${flowWidth}px;
          padding: 0;
          column-width: ${contentWidth}px;
          column-gap: ${columnGap}px;
          column-fill: auto;
          outline: none;
        }
        .multipage-editor-flow .ProseMirror > * {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      `}</style>

      {/* Frames vacíos (como el editor) */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${visiblePageIndices.length}, minmax(0, 1fr))`,
          gap: `${pageGap}px`,
        }}
      >
        {visiblePageIndices.map((pageIndex) => (
          <div
            key={pageIndex}
            className="multipage-page-frame bg-[#111C28] min-h-[${pageHeight}px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/5"
          >
            <div className="multipage-page-inner" style={pagePaddingStyle} />
          </div>
        ))}
      </div>

      {/* Flujo de columnas real */}
      <div
        ref={multipageFlowRef}
        className="multipage-editor-flow prose prose-invert max-w-none prose-img:rounded-lg prose-img:shadow-md"
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
    </div>
  );
}
```

Esto es básicamente el layout del editor, sin TipTap.

***

## 2) Construir un `contentHtml` reconciliado en `PreviewModal`

En `PreviewModal.tsx`, añade imports:

```ts
import { MultipageFlow } from '@/components/projects/MultipageFlow';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import { reconcileOverflowBreaks } from '@/lib/preview/editor-page-layout';
```

Luego, debajo del `useMemo` que construye `paginationConfig`, crea un `useMemo` para el HTML de contenido:

```ts
const contentHtml = useMemo(() => {
  const chapterSections: { id: string; title: string; html: string }[] = [];

  if (project.document.chapters?.length) {
    const sorted = [...project.document.chapters].sort((a, b) => a.order - b.order);
    sorted.forEach((chapter, index) => {
      const chapterTitle = chapter.title?.trim() || `Capítulo ${index + 1}`;
      const html = chapterBlocksToHtml(chapter.blocks);
      chapterSections.push({
        id: chapter.id,
        title: chapterTitle,
        html: html || '<p><em>Contenido aún no disponible</em></p>',
      });
    });
  }

  const reconciledSegments = chapterSections.map((ch) =>
    reconcileOverflowBreaks(ch.html, paginationConfig),
  );

  // Separar capítulos con un salto manual entre capítulos
  return reconciledSegments.join('<hr data-page-break="manual" />');
}, [project, paginationConfig]);
```

Esto sustituye la lógica de `buildPreviewPages` *solo* para la parte visual del contenido; puedes seguir usando `buildPreviewPages` para portada/contraportada y TOC si quieres.

***

## 3) Sustituir el render de páginas de contenido por `MultipageFlow`

Dentro de `PreviewModal`:

1. Añade estado para el número de páginas de contenido:
```ts
const [totalContentPages, setTotalContentPages] = useState(1);
```

2. Calcula índices lógicos:
```ts
const hasBackCover = Boolean(project.backCover);
const firstContentPageIndex = 1; // 0 = portada
const lastContentPageIndex = firstContentPageIndex + totalContentPages - 1;
const logicalTotalPages =
  1 + totalContentPages + (hasBackCover ? 1 : 0);
```

3. Ajusta `goToPage` / navegación para usar `logicalTotalPages` en vez de `pages.length`.
4. En el JSX del `<main>` del modal, sustituye la parte donde ahora haces:
```tsx
const visiblePages = useMemo(() => { ... });
...
<div data-testid="preview-stage-surface">
  <div ... style={{ width: scaledSpreadWidth, height: scaledSpreadHeight }}>
    {visiblePages.map((page, index) => renderPage(page, index))}
  </div>
</div>
```

por algo del estilo:

```tsx
<div data-testid="preview-stage-surface" className="min-h-full flex items-center justify-center">
  <div
    data-testid="preview-spread-frame"
    className="relative mx-auto transition-all duration-300"
    style={{
      width: `${scaledSpreadWidth}px`,
      height: `${scaledSpreadHeight}px`,
      transform: `scale(${zoomScale})`,
    }}
  >
    {/* Portada */}
    {currentPage === 0 && renderPage(pages[0], 0)}

    {/* Contenido con columnas */}
    {currentPage >= firstContentPageIndex &&
      currentPage <= lastContentPageIndex && (
        <MultipageFlow
          html={contentHtml}
          config={paginationConfig}
          currentPage={currentPage - firstContentPageIndex}
          viewMode={viewMode}
          margins={preferences.margins!}
          onPageCountChange={setTotalContentPages}
        />
      )
    }

    {/* Contraportada */}
    {hasBackCover && currentPage === logicalTotalPages - 1 && renderPage(
      pages.find((p) => p.type === 'back-cover') as PreviewPage,
      0,
    )}
  </div>
</div>
```

- `renderPage` lo mantienes tal cual para portada y back-cover; **solo dejas de usarlo para páginas de contenido**, que pasan a depender de `MultipageFlow`.

***

## 4) Ajustar `totalPages` / navegación

- Donde ahora tienes `const totalPages = pages.length;`, sustitúyelo por `logicalTotalPages`.
- `goToPage`, `nextPage`, `prevPage`, y el handler de teclado (`Home`, `End`) deben usar `logicalTotalPages`.

Ejemplo rápido:

```ts
const goToPage = useCallback(
  (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, logicalTotalPages - 1)));
  },
  [logicalTotalPages],
);
```

Y en el handler de teclado:

```ts
} else if (e.key === 'End') {
  e.preventDefault();
  goToPage(logicalTotalPages - 1);
}
```


***

## 5) Qué tendrás después de esta fase

Con solo estos cambios:

- El contenido del preview se renderiza con **el mismo sistema de columnas** que el editor y los mismos `<hr data-page-break>` generados por `reconcileOverflowBreaks`.
- Los cortes de párrafo/listas/imagenes por página en el preview deberían coincidir visualmente con el editor para el mismo device/font/margins.
- Aún no has tocado el editor, ni TipTap; así que si algo se tuerce, solo afecta al preview y puedes revertir rápido.

Cuando tengas esto funcionando, el siguiente paso (fase B) será:

- Refactorizar `AdvancedRichTextEditor` para que reuse `MultipageFlow` en lugar de tener su propio bloque de layout duplicado, y unificar del todo el CSS de `.ProseMirror`/`.preview-page`.

Si quieres, cuando te pongas a implementarlo y tengas un WIP, puedo ayudarte a revisar un diff específico (pseudocode ➜ patch real) basándonos en cómo te quede `PreviewModal.tsx`.

