# Estado técnico — Rama `claude/import-word-document-81EWw`

> Fecha: 2026-04-16  
> Rama: `claude/import-word-document-81EWw`

---

## 1. Qué se quería resolver

Tres problemas relacionados con el flujo de importación de documentos Word y la edición de capítulos:

1. **El botón "Actualizar numeración" no hacía nada** — el índice en el editor nunca mostraba números de página tras pulsarlo.
2. **El capítulo Índice en el editor no mostraba todas las entradas** — faltaban `CIERRE: LA VISIBILIDAD SOSTENIBLE`, `Después de los 30 días` y `Recursos recomendados`.
3. **El contenido por página del índice no coincidía entre el editor y el preview**.

---

## 2. Cambios introducidos

### Commit `fix(numeracion)` — Bug crítico en `actions.ts`

**Archivo:** `src/lib/projects/actions.ts`, función `syncProjectPaginationAction`

**Problema:** La función calculaba el HTML correcto del índice con números de página (`syncedToc.html`) pero luego lo descartaba. En su lugar tomaba el HTML almacenado, le *eliminaba* los números (`sanitizedTocHtml`) y sólo guardaba si había diferencia. Para proyectos recién importados sin números previos, `sanitizedTocHtml === persistedTocHtml` → la condición siempre era falsa → **nunca persistía nada**. El botón mostraba el checkmark verde pero sin haber guardado nada.

**Corrección:** Usar `syncedToc.html` (el HTML con los números calculados) como el valor a persistir y comparar contra ese para decidir si guardar.

```typescript
// ❌ Antes
const syncedHtml = syncedToc.html; // calculado pero ignorado
const sanitizedTocHtml = stripExistingTocPageNumbers(persistedTocHtml);
if (tocChapter && sanitizedTocHtml !== persistedTocHtml) {
  await projectRepository.saveDocument(..., { content: sanitizedTocHtml }); // SIN números
}

// ✅ Después
const syncedHtml = syncedToc.html;
if (tocChapter && syncedHtml !== persistedTocHtml) {
  await projectRepository.saveDocument(..., { content: syncedHtml }); // CON números
}
```

---

### Commit `0a79076` — Tres correcciones en el último push

#### 2a. Entradas ausentes en el índice — `preview-builder.ts`

**Archivos:** `src/lib/preview/preview-builder.ts`  
**Funciones modificadas:** `isTocChapter`, `buildOutlineEntries`, `buildTocChapterHtml`  
**Nueva función:** `buildTocHtmlFromEntries`

**Problema:** `injectTocPageNumbers` sólo puede inyectar números en entradas que **ya existen** en el HTML base. No puede añadir entradas nuevas. Para proyectos importados antes de que la pipeline generase `CIERRE`, `Después de los 30 días` y `Recursos recomendados`, el HTML almacenado en la DB no contiene esas entradas → el botón inyectaba números pero las entradas seguían sin aparecer.

**Corrección (tres partes):**

1. **`isTocChapter` ampliado** — reconoce ahora "Tabla de contenidos", "Contenidos", "Sumario", "Table of contents", etc. (antes sólo "índice" / "indice" / "index").

2. **`buildOutlineEntries` suplementa entradas ausentes** — cuando el HTML almacenado tiene entradas pero faltan algunas, busca en `project.document.source.outline` (guardado desde el import original) entradas que coincidan con `MAJOR_HEADING_RE` y no estén ya en el HTML. También detecta capítulos reales del proyecto que falten en el índice almacenado. Las inserta en la posición correcta (después del último `Día X`, antes de las secciones finales).

3. **`buildTocChapterHtml` usa HTML fresco cuando hay suplementos** — si `buildOutlineEntries` devuelve más entradas de las que había en el HTML almacenado (`hasSupplement = outlineEntries.length > visibleFromHtml.length`), genera HTML completo con `buildTocHtmlFromEntries` en lugar de reutilizar el HTML incompleto como base. Así el resultado final contiene todas las entradas con sus números de página.

```
MAJOR_HEADING_RE = /^(?:capítulo|chapter|introducción|prólogo|fase\s+\d+|parte\s+\d+|
                        sección|epílogo|cierre|después\s+de|recursos(?:\s+recomendados)?|
                        anexos?)(?:\b|:)/i
```

#### 2b. Recorte de contenido en el editor — `useChapterEditor.ts`

**Archivo:** `src/components/projects/advanced-chapter-editor/useChapterEditor.ts`

**Problema:** El editor usa CSS columns. El número total de columnas (= páginas) define el ancho del contenedor `ProseMirror`. Si `totalPages` era inferior al real, el contenedor era demasiado estrecho y el contenido de las columnas de desbordamiento quedaba **físicamente recortado** (invisible). El método de medición tampoco podía detectarlo porque el contenedor exterior tiene `overflow-x: hidden`.

La causa era `Math.min(estimatedTotalPages, measuredTotalPages)` — si la estimación era inferior a la medición, el `Math.min` usaba el valor más pequeño, perpetuando el recorte.

**Corrección:** `Math.min` → `Math.max`.

```typescript
// ❌ Antes
Math.min(estimatedTotalPages, measuredTotalPages)

// ✅ Después
Math.max(estimatedTotalPages, measuredTotalPages)
```

#### 2c. Desajuste editor/preview en importaciones nuevas — `import-pipeline.ts`

**Archivo:** `src/lib/projects/import-pipeline.ts`, función `buildGeneratedIndexChapter`

**Problema:** Los `Día X` de cada `FASE` se generaban en bloques `<ul>` de máximo 6 elementos (chunking). Esto producía múltiples `<ul>` adyacentes en el HTML. `normalizeHtmlContent` los fusiona en el editor (browser vía `DOMParser`). El preview también llama a `normalizeHtmlContent`, pero la paginación ocurre antes de la normalización en algunos flujos, pudiendo producir resultados diferentes.

**Corrección:** Eliminar el chunking. Cada grupo de `Día X` bajo una `FASE` genera ahora un único `<ul>` con todos sus elementos.

```typescript
// ❌ Antes
for (const chunk of chunkOutlineItems(nestedItems, 6)) {
  blocks.push({ content: `<ul>${chunk.map(…)}</ul>` });
}

// ✅ Después
blocks.push({ content: `<ul>${nestedItems.map(…)}</ul>` });
```

---

### Commits anteriores (historial completo de la rama)

| Commit | Descripción |
|--------|-------------|
| `a003733` | import-pipeline: labels ricos desde la caché Word del TOC + entrada CIERRE |
| `e158805` | import-pipeline: no excluir títulos cortos que coincidan con MAJOR_HEADING_RE |
| `b5e77d9` | import-pipeline: título "Índice" como bloque heading + jerarquía semántica correcta |
| `2de7a00` | import-pipeline: excluir subsecciones internas cortas (Reflexión, Reto de Acción) |
| `ccca737` | import-pipeline: generar siempre TOC desde headings reales, no desde el TOC cacheado de Word |
| `1afdb7e` | preview-builder: avanzar `pageCursor` en coincidencia por fallback + strip sufijo TOC de Word |
| `280e53e` | **Bug crítico** actions.ts: guardar HTML con números, no sin ellos |

---

## 3. Errores que pueden persistir

### 3.1 CIERRE depende de `source.outline` (riesgo alto para proyectos antiguos)

La corrección de entradas ausentes lee `project.document.source?.outline`. Este campo se guarda en la DB durante el import como `detectedOutline`. Si el proyecto fue importado con una versión de la pipeline anterior a la que detectaba CIERRE como heading bold, `source.outline` puede no contener esa entrada.

**Verificación pendiente:** abrir la DB para el proyecto "Nunca más" y comprobar que `source.outline` contiene una entrada cuyo título comience por "CIERRE".

Si no está, la corrección actual **no añadirá CIERRE** porque no tiene de dónde sacarlo. En ese caso habría que re-importar el documento.

---

### 3.2 Coincidencia exacta de página entre editor y preview (riesgo medio)

El editor renderiza con CSS columns nativas del navegador (motor de layout real). El preview usa un estimador de líneas por nodo (`estimateNodeLines`) que aplica heurísticas (`fontMul`, `lineHeight`, `padding`). Aunque el HTML base sea idéntico tras el fix, el número de líneas por nodo puede diferir levemente (párrafos largos, fuentes variables, etc.), provocando que una misma entrada del índice aparezca en una página diferente en el editor vs. el preview.

Este desajuste es **estructural** — resolverlo completamente requeriría o bien usar el motor CSS del navegador en el preview, o bien ajustar finamente las heurísticas de `estimateNodeLines`.

---

### 3.3 Medición de páginas del editor con `overflow-x: hidden` (riesgo medio)

`measureRenderablePages` en `AdvancedRichTextEditor.tsx` usa `getClientRects()` sobre los hijos de ProseMirror. El contenedor exterior tiene `overflow-x: hidden`, lo que hace que `getClientRects()` devuelva rectángulos recortados al viewport visible. En la práctica, si el contenedor es más ancho que el viewport, la medición puede subestimar el número de páginas.

El fix de `Math.min → Math.max` mitiga el efecto (usa el máximo entre estimado y medido), pero la medición sigue siendo potencialmente imprecisa.

---

### 3.4 Numeración desactualizada tras cambios de capítulos (riesgo bajo, UX)

No hay mecanismo que notifique al usuario que los números de página del índice están desactualizados después de añadir, eliminar o reordenar capítulos. El botón "Actualizar numeración" no se activa ni muestra badge de "pendiente" automáticamente.

---

### 3.5 `isTocChapter` no detecta variantes con artículo (riesgo muy bajo)

Títulos como "El índice", "El sumario" o "La tabla de contenidos" no son reconocidos. Caso edge poco probable en documentos reales.

---

## 4. Flujo completo tras los cambios

```
Usuario pulsa "Actualizar numeración"
  → syncProjectPaginationAction (actions.ts)
    → buildSyncedTocChapterContent (preview-builder.ts)
      → resolveTocChapterHtml
        → buildTocChapterHtml
          → extractTocRenderableEntries(fallbackHtml)  [entradas en HTML almacenado]
          → buildOutlineEntries                         [+ suplementos de source.outline]
          → measureOutlineEntryPageMetrics             [páginas reales por capítulo]
          → hasSupplement? buildTocHtmlFromEntries : fallbackHtml
          → injectTocPageNumbers(baseHtml, numberedEntries)
    → si syncedHtml ≠ persistedTocHtml → saveDocument(syncedHtml)
    → revalidatePath → editor y preview se recargan con el nuevo HTML
```

Tras el guardado, el editor muestra el HTML con los números inyectados. El preview recalcula dinámicamente con los mismos datos. Ambos parten del mismo HTML base → las páginas deben coincidir salvo las diferencias de heurística descritas en §3.2.
