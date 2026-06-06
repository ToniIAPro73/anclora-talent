# Fix de Importación — Índice duplicado y fidelidad al DOCX

**Problema detectado en:** `Nunca_mas_en_la_sombra.docx`  
**Síntomas (ver capturas):**
- El capítulo 2 "Índice" muestra entradas duplicadas: "Introducción: Activación...----4" y luego "Introducción---9"
- Los números de página inyectados no coinciden con el documento original
- El editor crea capítulos falsos a partir de líneas del índice ("FASE 1: PERCEPCIÓN...", "Día 1: Autoimagen")

**Causa raíz:**
1. `parseHtmlBlocks` en `src/lib/projects/import-pipeline.ts` convierte **cualquier párrafo en negrita o que coincida con regex** en un heading, aunque en el DOCX original sea un `<p>` normal del índice.
2. `buildImportedDocumentSeed` siempre regenera el índice desde los capítulos detectados, descartando el índice manual del autor.

---

## Solución en 2 pasos

### Paso 1 — Confiar en los estilos de Word, no en heurísticas

**Archivo:** `src/lib/projects/import-pipeline.ts`

**Cambio A: eliminar conversión agresiva de párrafos a headings**

Busca la función `parseHtmlBlocks` (línea ~120) y reemplaza el bloque:

```ts
// ANTES (líneas problemáticas)
if (
  isStrongOnlyParagraph(clean) ||
  (!/<br\s*\/?>/i.test(clean) && isStrongStandaloneHeadingSignal(text))
) {
  return [{
    kind: 'heading' as const,
    text: cleanHeadingText(text),
    html: clean,
    level: inferHeadingLevel(text) ?? 2,
    structural: false,
  }];
}
```

**POR:**
```ts
// DESPUÉS — solo confiamos en <h1>-<h6> reales de Mammoth
// Los párrafos del índice que están en negrita se mantienen como párrafos
if (tag.startsWith('h')) {
  // ya manejado arriba
}
// eliminar el bloque completo de isStrongOnlyParagraph
```

**Resultado:** Las líneas del índice "FASE 1: PERCEPCIÓN..." que vienen como `<p>` se quedan como párrafos, no crean capítulos falsos.

**Cambio B: desactivar inferencia de nivel por texto en HTML**

En la misma función, asegúrate que para HTML solo se use el nivel del tag:

```ts
if (tag.startsWith('h')) {
  return [{
    kind: 'heading',
    text: cleanHeadingText(text),
    html: clean,
    level: Number(tag.replace('h', '')), // NO usar inferHeadingLevel
    structural: true,
  }];
}
```

### Paso 2 — Preservar índice manual del autor

**Archivo:** `src/lib/projects/import-pipeline.ts` — función `buildImportedDocumentSeed`

Busca (línea ~340):
```ts
const hasExplicitIndex = explicitIndexIdx >= 0;
```

**Después de detectar el índice, añade:**

```ts
if (hasExplicitIndex) {
  // NO regenerar el índice. Mantener el contenido original del DOCX
  // y marcarlo para que buildSyncedTocChapterContent solo inyecte números,
  // no reemplace entradas.
  const indexChapter = detectedChapters[explicitIndexIdx];
  // Forzar que el outline no se reconstruya desde cero
  detectedOutline = detectedOutline.filter(e => !isTocChapterTitle(e.title));
  // Mantener el capítulo índice exactamente como vino
  detectedChapters[explicitIndexIdx] = {
    ...indexChapter,
    // Marcar como no estructural para que no se use para generar otros capítulos
    blocks: indexChapter.blocks.map(b => ({ ...b, preserveOriginal: true })),
  };
}
```

Luego, más abajo donde se construye `outlineForIndex`, envuélvelo en:

```ts
let outlineForIndex: OutlineEntry[];
if (hasExplicitIndex) {
  // Usar el índice del autor tal cual, solo para numeración posterior
  outlineForIndex = [];
} else {
  // ...código existente de regeneración...
}
```

---

## Verificación con tu documento

1. **Antes del fix:**
   - Importa `Nunca_mas_en_la_sombra.docx`
   - Capítulo 2 contiene 43 líneas mezcladas, con duplicados

2. **Después del fix:**
   - Capítulo 2 "Índice" contiene exactamente las 23 líneas del DOCX original (sin ---- números aún)
   - Capítulos reales empiezan en "Introducción" (Heading 1 del DOCX)
   - No hay capítulos falsos "FASE 1", "Día 1", etc.

3. **Numeración:**
   - Pulsa "Actualizar numeración"
   - El índice ahora muestra `Introducción...4`, `FASE 1...5` etc., inyectados sobre el texto original, sin duplicar entradas

---

## Por qué Preview, PDF y DOCX serán idénticos

Con este fix, el flujo queda:

```
DOCX original → import-pipeline (respeta <h1>/<h2>) → 
  ProjectRecord.document.chapters → 
    editor (fuente de verdad) → 
      buildPreviewPages (misma data) → 
        Preview / PDF / DOCX
```

Ya no hay heurísticas que creen capítulos fantasmas. Los tres exports usan `buildPreviewPages`, que lee del mismo `ProjectRecord`.

---

## Archivos a modificar

1. `src/lib/projects/import-pipeline.ts` — 2 cambios (≈15 líneas)
2. `src/lib/preview/preview-builder.ts` — asegurar que `buildSyncedTocChapterContent` no añada entradas si `hasExplicitIndex`

**Test de aceptación:**
```bash
npm run dev
# Importar Nunca_mas_en_la_sombra.docx
# Verificar en /editor que Capítulo 2 tiene 23 párrafos, no 43
# Verificar que no existen capítulos "FASE 1" duplicados
```

¿Quieres que te genere el diff completo listo para aplicar con `git apply`?
