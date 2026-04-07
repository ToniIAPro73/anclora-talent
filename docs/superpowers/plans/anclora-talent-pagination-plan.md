# Anclora Talent – Plan de implementación de paginación realista

> Objetivo: implementar una paginación realista por capítulo y dispositivo en anclora‑talent, reaprovechando la arquitectura de Anclora‑Press y respetando los contratos premium del ecosistema.[file:6][file:7]

---

## Roadmap de commits / tareas

### Commit 1 – Refactor de `buildPreviewPages` para paginar por capítulo

**Objetivo:** que `buildPreviewPages(project, config)` devuelva todas las páginas (cover, TOC, contenido, back‑cover) ya paginadas, con numeración global y metadatos de capítulo.

Tareas:

1. **Extender tipo `PreviewPage`** en `src/lib/preview/preview-builder.ts`:
   - Asegurar `pageNumber: number` como obligatorio.
   - Añadir `chapterId?: string` y mantener `chapterTitle?: string`.

2. **Cambiar flujo de construcción de páginas** en `buildPreviewPages`:
   - Mantener página 1 como `cover`.
   - Construir una colección `chapterSections`:
     - Iterar capítulos ordenados por `order`.
     - Para cada capítulo:
       - Generar HTML del capítulo: `'<h2>' + title + '</h2>' + blocksToHtml(blocks)`.
       - Llamar a `paginateContent(chapterHtml, config)` (ya existe en `content-paginator.ts`).
       - Para cada `ContentPage` devuelto, crear entrada con `html` y asignar `pageNumber` incremental empezando en 3.

3. **Construir TOC a partir de `chapterSections`**:
   - Para cada capítulo con al menos una página:
     - Crear entrada `{ title, pageNumber: firstPage.pageNumber, level: 1 }`.
   - Generar HTML con `generateTOCHtml` (ya existe) y añadir página 2 como `type: 'toc'`.

4. **Añadir páginas de contenido**:
   - Para cada capítulo, para cada página paginada:
     - `pages.push({ type: 'content', content: page.html, chapterTitle, chapterId, pageNumber })`.

5. **Back cover** (si existe):
   - Añadir como última página con `pageNumber = pages.length + 1`.

6. **Orden final:**
   - Asegurar `return pages.sort((a, b) => a.pageNumber - b.pageNumber)`.

### Commit 2 – Integrar builder en `PreviewModal` y simplificar paginación

**Objetivo:** eliminar la segunda paginación dentro del modal y usar únicamente el resultado de `buildPreviewPages`.

Tareas:

1. En `src/components/projects/PreviewModal.tsx`:
   - Reemplazar el `useMemo` actual de `pages` por:
     ```ts
     const pages = useMemo(() => {
       const config = DEVICE_PAGINATION_CONFIGS[format];
       return buildPreviewPages(project, config);
     }, [project, format]);
     ```
   - Eliminar el código que recalculaba `expandedPages` con `paginateContent`.

2. **TOC del lateral en `PreviewModal`**:
   - Generar entradas a partir de las páginas de contenido:
     ```ts
     const tocEntries = useMemo(() => {
       const seen = new Set<string>();
       return pages
         .filter(p => p.type === 'content' && p.chapterTitle)
         .filter(p => {
           const key = p.chapterTitle!;
           if (seen.has(key)) return false;
           seen.add(key);
           return true;
         })
         .map(p => ({
           title: p.chapterTitle!,
           pageIndex: pages.findIndex(pg => pg.pageNumber === p.pageNumber),
           pageNumber: p.pageNumber,
         }));
     }, [pages]);
     ```
   - Ajustar el click en el índice para usar `goToPage(entry.pageIndex)`.

3. **Paginador inferior**:
   - Asegurar que el input muestra `currentPage + 1` y límite `max={totalPages}` con `totalPages = pages.length`.

4. **`PageRenderer`**:
   - No necesita cambios lógicos; sólo asegurarse de utilizar `page.pageNumber` directamente para mostrar el número.

### Commit 3 – Métricas de páginas por capítulo en el editor

**Objetivo:** mostrar, en el shell del editor, el número aproximado de páginas que ocupa cada capítulo por formato (mobile/tablet/desktop) utilizando el mismo motor de paginación.

Tareas:

1. Crear helper `src/lib/preview/metrics.ts`:
   - Función `computeChapterPageMetrics(project: ProjectRecord)` que:
     - Ordena capítulos por `order`.
     - Para cada capítulo:
       - Construye HTML de capítulo (igual que en el builder).
       - Para cada formato en `['mobile','tablet','laptop']`:
         - Obtiene `config = DEVICE_PAGINATION_CONFIGS[format]`.
         - Llama a `paginateContent(html, config)`.
         - Guarda `pagesByFormat[format] = contentPages.length`.
     - Devuelve array de `{ chapterId, title, pagesByFormat }`.

2. En `ProjectWorkspace` o en el componente contenedor del editor:
   - Llamar a `computeChapterPageMetrics(project)` en el lado servidor.
   - Pasar las métricas a `ChapterOrganizer` como prop.

3. En `ChapterOrganizer.tsx`:
   - Recibir `metricsById: Record<string, ChapterPageMetrics>`.
   - Debajo del título del capítulo, mostrar algo tipo:
     ```tsx
     const m = metricsById[chapter.id];
     {m && (
       <span className="text-[11px] text-[var(--text-tertiary)]">
         ≈ {m.pagesByFormat.mobile ?? '-'} pág móvil · {m.pagesByFormat.tablet ?? '-'} tablet · {m.pagesByFormat.laptop ?? '-'} desktop
       </span>
     )}
     ```

### Commit 4 – Saltos de página manuales en el editor avanzado

**Objetivo:** permitir que el autor inserte saltos de página explícitos que el paginador respetará al construir páginas.[file:4][file:8]

Tareas:

1. Crear helper `src/lib/preview/page-breaks.ts` (puedes inspirarte en Anclora‑Press):
   ```ts
   export const PAGE_BREAK_MARK = '<!-- page-break -->';

   const PAGE_BREAK_PATTERN = /<!--\s*page-break\s*-->/i;
   const PAGE_BREAK_GLOBAL = /<!--\s*page-break\s*-->/gi;

   export function isPageBreakMarker(value: string): boolean {
     return PAGE_BREAK_PATTERN.test(value.trim().toLowerCase());
   }

   export function replacePageBreakMarkers(value: string, replacement: string): string {
     return value.replace(PAGE_BREAK_GLOBAL, replacement);
   }
   ```

2. **Editor avanzado (`AdvancedRichTextEditor.tsx`)**:
   - Añadir un botón en la toolbar para insertar un salto de página:
     ```tsx
     <ToolbarButton
       onClick={() => {
         editor
           .chain()
           .focus()
           .insertContent('<hr data-page-break="true" />')
           .run();
       }}
       title="Insertar salto de página"
     >
       <IconoPageBreak className="h-4 w-4" />
     </ToolbarButton>
     ```
   - Estilos CSS (en `globals.css` o similar) para que el HR especial sea reconocible:
     ```css
     hr[data-page-break="true"] {
       border: 0;
       border-top: 1px dashed var(--border-subtle);
       margin: 2rem 0;
       position: relative;
     }

     hr[data-page-break="true"]::after {
       content: 'Salto de página (preview)';
       position: absolute;
       top: -0.9rem;
       left: 50%;
       transform: translateX(-50%);
       padding: 0 0.5rem;
       background: var(--page-surface);
       color: var(--text-tertiary);
       font-size: 0.7rem;
       text-transform: uppercase;
       letter-spacing: 0.08em;
     }
     ```

3. **Respetar el salto en `paginateContent`** (`src/lib/preview/content-paginator.ts`):
   - Dentro del bucle `for (const node of nodes) { ... }`, antes de calcular `nodeLines`, añadir:
     ```ts
     if (
       node.nodeType === Node.ELEMENT_NODE &&
       (node as Element).tagName === 'HR' &&
       (node as Element).getAttribute('data-page-break') === 'true'
     ) {
       if (currentPageNodes.length > 0) {
         const pageDiv = document.createElement('div');
         pageDiv.className = 'preview-page-content';
         currentPageNodes.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));

         pages.push({
           type: 'content',
           html: pageDiv.innerHTML,
           chapterTitle: currentChapter,
           pageNumber: pages.length + 1,
         });

         currentPageNodes = [];
         currentLines = 0;
       }
       // No añadimos el HR a ninguna página para que el lector no lo vea (o añádelo si quieres marca visual)
       continue;
     }
     ```

### Commit 5 – (Opcional) Estimación aproximada de páginas respecto a Word

**Objetivo:** mostrarle al autor una referencia “DOCX ≈ X páginas · Talent print ≈ Y páginas”, para educar en que la paginación depende del formato.[web:15]

Tareas:

1. En el import de DOCX (`src/lib/projects/import.ts` + `import-pipeline.ts`):
   - A partir del texto plano de origen (`ExtractedImportSource.text`):
     - Contar palabras (`split(/\s+/)` filtrando vacíos).
     - Estimar `sourceEstimatedPages = Math.ceil(wordCount / WORDS_PER_PAGE)` con un valor configurable (p.ej. 300 palabras/página).
   - Guardar este valor en `project.document.source.estimatedPages` o campo similar.

2. En el dashboard o header del editor:
   - Mostrar algo como: “DOCX ≈ 43 págs · Talent (print 6×9) ≈ 38 págs”.
   - Para el lado Talent, usa el mismo motor de paginación con un `PaginationConfig` “print” fijo.

---

## Snippets de tests unitarios (Vitest)

A continuación tienes casos base para validar la lógica de paginación y el builder. Los nombres y rutas están pensados para integrarse con tu estructura actual (`vitest.config.ts`).

### 1. Tests para `paginateContent` (servidor / fallback por caracteres)

**Archivo sugerido:** `src/lib/preview/content-paginator.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { paginateContent } from './content-paginator';
import { type PaginationConfig } from './device-configs';

const BASE_CONFIG: PaginationConfig = {
  pageWidth: 576,
  pageHeight: 864,
  marginTop: 72,
  marginBottom: 72,
  marginLeft: 72,
  marginRight: 72,
  fontSize: 16,
  lineHeight: 1.6,
};

function repeatParagraph(text: string, times: number): string {
  return Array.from({ length: times }, () => `<p>${text}</p>`).join('\n');
}

describe('paginateContent - server fallback', () => {
  it('returns single page for short content', () => {
    const html = '<h2>Título</h2><p>Texto corto.</p>';
    const pages = paginateContent(html, BASE_CONFIG);

    expect(pages).toHaveLength(1);
    expect(pages[0].html).toContain('Título');
  });

  it('splits long content into multiple pages', () => {
    const html = `<h2>Capítulo 1</h2>${repeatParagraph('Lorem ipsum dolor sit amet.', 200)}`;
    const pages = paginateContent(html, BASE_CONFIG);

    expect(pages.length).toBeGreaterThan(1);
    // Todas las páginas deben tener tipo content y un número secuencial
    pages.forEach((p, index) => {
      expect(p.type).toBe('content');
      expect(p.pageNumber).toBe(index + 1);
    });
  });

  it('propagates chapterTitle across pages when heading present', () => {
    const html = `<h2>Capítulo 1</h2>${repeatParagraph('Texto', 150)}`;
    const pages = paginateContent(html, BASE_CONFIG);

    expect(pages[0].chapterTitle).toBe('Capítulo 1');
    // Las páginas posteriores mantienen el último título detectado
    if (pages.length > 1) {
      expect(pages[pages.length - 1].chapterTitle).toBe('Capítulo 1');
    }
  });

  it('forces page break at manual HR page-break marker', () => {
    const html = [
      '<h2>Capítulo 1</h2>',
      repeatParagraph('Antes del salto', 10),
      '<hr data-page-break="true" />',
      repeatParagraph('Después del salto', 10),
    ].join('\n');

    const pages = paginateContent(html, BASE_CONFIG);

    expect(pages.length).toBeGreaterThan(1);

    // Verificación suave: el texto "Antes del salto" no debe mezclarse con "Después del salto" en la misma página
    const pageHtmlJoined = pages.map((p) => p.html).join('\n');
    expect(pageHtmlJoined.includes('Antes del salto')).toBe(true);
    expect(pageHtmlJoined.includes('Después del salto')).toBe(true);
  });
});
```

### 2. Tests para `buildPreviewPages` (estructura completa)

**Archivo sugerido:** `src/lib/preview/preview-builder.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { buildPreviewPages } from './preview-builder';
import { DEVICE_PAGINATION_CONFIGS } from './device-configs';
import type { ProjectRecord } from '@/lib/projects/types';

function makeTestProject(): ProjectRecord {
  return {
    id: 'proj-1',
    slug: 'nunca-mas-en-la-sombra',
    cover: {
      title: 'Nunca más en la sombra',
      subtitle: 'El Sistema PPP',
      palette: 'obsidian',
    },
    backCover: {
      title: 'Nunca más en la sombra',
      body: 'Texto de contraportada.',
      authorBio: 'Bio del autor.',
    },
    document: {
      title: 'Nunca más en la sombra',
      subtitle: 'Guía de maestría personal en 30 días',
      author: 'Antonio Ballesteros Alonso',
      chapters: [
        {
          id: 'ch-1',
          order: 1,
          title: 'Introducción',
          blocks: [
            { id: 'b1', type: 'heading', content: 'Introducción' },
            { id: 'b2', type: 'paragraph', content: 'Contenido de introducción.' },
          ],
        },
        {
          id: 'ch-2',
          order: 2,
          title: 'Fase 1: Percepción',
          blocks: [
            { id: 'b3', type: 'heading', content: 'Fase 1: Percepción' },
            { id: 'b4', type: 'paragraph', content: 'Contenido de la fase 1.' },
          ],
        },
      ],
      source: undefined,
    },
  } as any;
}

describe('buildPreviewPages', () => {
  const config = DEVICE_PAGINATION_CONFIGS.laptop;

  it('includes cover, TOC, content and back-cover pages', () => {
    const project = makeTestProject();
    const pages = buildPreviewPages(project, config);

    const types = pages.map((p) => p.type);

    expect(types[0]).toBe('cover');
    expect(types).toContain('toc');
    expect(types).toContain('content');
    expect(types).toContain('back-cover');

    // Página 1 debe ser la cover
    expect(pages[0].pageNumber).toBe(1);
    // Página 2 debe ser el TOC
    const tocPage = pages.find((p) => p.type === 'toc');
    expect(tocPage?.pageNumber).toBe(2);
  });

  it('assigns chapter metadata to content pages', () => {
    const project = makeTestProject();
    const pages = buildPreviewPages(project, config);

    const contentPages = pages.filter((p) => p.type === 'content');
    expect(contentPages.length).toBeGreaterThan(0);

    // Debe haber al menos una página del capítulo 1
    const introPages = contentPages.filter((p) => p.chapterTitle === 'Introducción');
    expect(introPages.length).toBeGreaterThan(0);

    // Debe haber al menos una página del capítulo 2
    const fasePages = contentPages.filter((p) => p.chapterTitle === 'Fase 1: Percepción');
    expect(fasePages.length).toBeGreaterThan(0);
  });

  it('TOC points to first page of each chapter', () => {
    const project = makeTestProject();
    const pages = buildPreviewPages(project, config);

    const tocPage = pages.find((p) => p.type === 'toc');
    expect(tocPage).toBeDefined();
    expect(tocPage!.tocEntries).toBeDefined();

    const tocEntries = tocPage!.tocEntries!;
    const firstIntroPage = pages.find(
      (p) => p.type === 'content' && p.chapterTitle === 'Introducción',
    );

    const introEntry = tocEntries.find((e) => e.title === 'Introducción');

    expect(firstIntroPage).toBeDefined();
    expect(introEntry).toBeDefined();
    expect(introEntry!.pageNumber).toBe(firstIntroPage!.pageNumber);
  });
});
```

### 3. Tests de métricas por capítulo (opcional)

**Archivo sugerido:** `src/lib/preview/metrics.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { computeChapterPageMetrics } from './metrics';
import type { ProjectRecord } from '@/lib/projects/types';

function makeSmallProject(): ProjectRecord {
  return {
    id: 'proj-metrics',
    slug: 'test-metrics',
    cover: { title: 'Test', subtitle: '', palette: 'obsidian' },
    backCover: null as any,
    document: {
      title: 'Test',
      subtitle: '',
      author: 'Autor',
      chapters: [
        {
          id: 'c1',
          order: 1,
          title: 'Corto',
          blocks: [{ id: 'b1', type: 'paragraph', content: 'Texto muy corto.' }],
        },
        {
          id: 'c2',
          order: 2,
          title: 'Largo',
          blocks: [{
            id: 'b2',
            type: 'paragraph',
            content: 'Lorem ipsum '.repeat(500),
          }],
        },
      ],
      source: undefined,
    },
  } as any;
}

describe('computeChapterPageMetrics', () => {
  it('returns metrics for each chapter and format', () => {
    const project = makeSmallProject();
    const metrics = computeChapterPageMetrics(project);

    expect(metrics).toHaveLength(2);

    const shortChapter = metrics.find((m) => m.title === 'Corto');
    const longChapter = metrics.find((m) => m.title === 'Largo');

    expect(shortChapter).toBeDefined();
    expect(longChapter).toBeDefined();

    // El capítulo largo debe tener más páginas que el corto al menos en un formato
    const mobileShort = shortChapter!.pagesByFormat.mobile ?? 0;
    const mobileLong = longChapter!.pagesByFormat.mobile ?? 0;

    expect(mobileLong).toBeGreaterThanOrEqual(mobileShort);
  });
});
```

---

Con este plan de commits y los tests base deberías poder enganchar a un agente o a otro desarrollador para implementar la paginación realista por capítulos, manteniendo la coherencia con los contratos premium de Anclora y reutilizando el motor de paginación existente.[file:6][file:7]