# Tests de regresión — Numeración de índice

**Objetivo:** evitar que vuelva el bug de `syncProjectPaginationAction` que guardaba el HTML del índice **sin números** (usaba `stripExistingTocPageNumbers` en lugar de `syncedToc.html`).

**Fecha:** 2026-04-16  
**Archivos afectados:** `src/lib/projects/actions.ts`, `src/lib/preview/preview-builder.ts`

---

## 1. Contexto del bug

Antes del fix (commit `fix(numeracion)`):
```ts
const syncedHtml = syncedToc.html; // calculado pero ignorado
const sanitizedTocHtml = stripExistingTocPageNumbers(persistedTocHtml);
if (tocChapter && sanitizedTocHtml !== persistedTocHtml) {
  await projectRepository.saveDocument(..., { content: sanitizedTocHtml }); // SIN números
}
```

Después del fix:
```ts
const syncedHtml = syncedToc.html;
if (tocChapter && syncedHtml !== persistedTocHtml) {
  await projectRepository.saveDocument(..., { content: syncedHtml }); // CON números
}
```

El test debe fallar si alguien vuelve a usar la versión sanitizada.

---

## 2. Test propuesto

Crear archivo: `src/lib/projects/actions.pagination.test.ts`

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(() => Promise.resolve('user_123')) }));

const saveDocumentMock = vi.fn();
const getProjectByIdMock = vi.fn();

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: {
    getProjectById: (...args: any[]) => getProjectByIdMock(...args),
    saveDocument: (...args: any[]) => saveDocumentMock(...args),
  },
}));

const buildSyncedMock = vi.fn();
vi.mock('@/lib/preview/preview-builder', async (importOriginal) => {
  const mod = await importOriginal() as any;
  return {
    ...mod,
    buildSyncedTocChapterContent: (...args: any[]) => buildSyncedMock(...args),
    stripExistingTocPageNumbers: mod.stripExistingTocPageNumbers,
    isTocChapter: mod.isTocChapter,
  };
});

vi.mock('./chapter-html', () => ({
  chapterBlocksToHtml: vi.fn(() => '<p>Índice</p>'), // HTML persistido SIN números
}));

import { syncProjectPaginationAction } from './actions';

function formData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

describe('syncProjectPaginationAction — regresión numeración', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectByIdMock.mockResolvedValue({
      id: 'proj_1',
      document: {
        title: 'Test',
        subtitle: '',
        author: 'Autor',
        chapters: [{ id: 'toc', title: 'Índice', blocks: [{ id: 'b1', content: '<p>Índice</p>' }] }],
      },
    });
  });

  test('persiste HTML con números cuando cambia', async () => {
    buildSyncedMock.mockReturnValue({
      chapterId: 'toc',
      html: '<p>Índice <span class="page-num">12</span></p>',
    });

    const res = await syncProjectPaginationAction(formData({ projectId: 'proj_1' }));
    
    expect(res.status).toBe('updated');
    expect(saveDocumentMock).toHaveBeenCalledTimes(1);
    const savedContent = saveDocumentMock.mock.calls[0][2].blocks[0].content;
    expect(savedContent).toContain('page-num');
    expect(savedContent).toContain('12');
  });

  test('no guarda si el HTML ya tiene los números', async () => {
    // Simula que ya está persistido
    const { chapterBlocksToHtml } = await import('./chapter-html');
    (chapterBlocksToHtml as any).mockReturnValue('<p>Índice <span class="page-num">12</span></p>');
    
    buildSyncedMock.mockReturnValue({
      chapterId: 'toc',
      html: '<p>Índice <span class="page-num">12</span></p>',
    });

    await syncProjectPaginationAction(formData({ projectId: 'proj_1' }));
    expect(saveDocumentMock).not.toHaveBeenCalled();
  });

  test('REGRESIÓN: falla si se guarda versión sanitizada', async () => {
    buildSyncedMock.mockReturnValue({
      chapterId: 'toc',
      html: '<p>Índice <span class="page-num">12</span></p>',
    });

    // Simula el bug antiguo: alguien usa stripExistingTocPageNumbers
    const { stripExistingTocPageNumbers } = await import('@/lib/preview/preview-builder');
    const sanitized = stripExistingTocPageNumbers('<p>Índice <span class="page-num">12</span></p>');
    
    // Si el código volviera al bug, guardaría esto:
    await syncProjectPaginationAction(formData({ projectId: 'proj_1' }));
    const saved = saveDocumentMock.mock.calls[0][2].blocks[0].content;
    
    // El test debe asegurar que NO es la versión sanitizada
    expect(saved).not.toBe(sanitized);
    expect(saved).toBe('<p>Índice <span class="page-num">12</span></p>');
  });
});
```

---

## 3. Cómo ejecutarlo

```bash
npm run test:run src/lib/projects/actions.pagination.test.ts
```

Debe pasar los 3 tests. Si alguien reintroduce `stripExistingTocPageNumbers` en el guardado, el tercer test fallará inmediatamente.

---

## 4. Cobertura adicional recomendada

Añade estos dos tests en el mismo archivo para cubrir los casos del `ESTADO_TECNICO.md`:

```ts
test('reconoce variantes de título de índice', async () => {
  const { isTocChapter } = await import('@/lib/preview/preview-builder');
  expect(isTocChapter('Tabla de contenidos')).toBe(true);
  expect(isTocChapter('Sumario')).toBe(true);
  expect(isTocChapter('Table of contents')).toBe(true);
});

test('suplementa entradas faltantes en buildSyncedTocChapterContent', async () => {
  // Este test requiere un proyecto con capítulos que no están en el HTML del TOC
  // Verifica que buildSyncedTocChapterContent añade "CIERRE", "Después de los 30 días", etc.
  // Implementación depende de tu factory createProjectRecord
});
```

---

## 5. Integración en CI

Añade a `.github/workflows/test.yml`:

```yaml
- name: Run pagination regression tests
  run: npm run test:run src/lib/projects/actions.pagination.test.ts
```

Con esto, cualquier PR que toque `actions.ts` o `preview-builder.ts` deberá pasar la validación de numeración.
