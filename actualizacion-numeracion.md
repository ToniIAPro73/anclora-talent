# Actualización — Botón "Actualizar numeración" y formato de índice

**Objetivo:** el documento se importa tal cual, sin números. El usuario decide cuándo añadirlos. Si el índice existe, se rellenan los números al final de cada línea con puntos medios '·', sin crear líneas nuevas, y se regenera solo si cambian los capítulos.

---

## 1. Comportamiento deseado

1. **Importación:** se respeta el índice original del DOCX, sin números.
2. **Primera pulsación del botón:**
   - Detecta que no hay números
   - Calcula la página inicial de cada capítulo
   - Añade al final de cada línea: `·····················N`
3. **Pulsaciones posteriores:**
   - Si no hay cambios en capítulos → no hace nada
   - Si se añade o elimina un capítulo → recalcula todos los números
   - Si ya existen números pero son incorrectos → los actualiza

---

## 2. Cambios en `src/lib/preview/preview-builder.ts`

### A) Líder con puntos medios

```ts
function buildDotLeader(level: number) {
  // Nivel 1 (FASE, Introducción) → líder más largo
  // Nivel 2 (Día X) → líder más corto
  const base = level === 1 ? 50 : 35;
  return '·'.repeat(base);
}
```

### B) Inyección de números sin crear nodos nuevos

Reemplaza la función `injectTocPageNumbers` completa:

```ts
function injectTocPageNumbers(
  html: string,
  numberedEntries: Array<{ title: string; level: number; firstPage: number }>,
) {
  let entryIndex = 0;

  return html.replace(
    /<(p|li|h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (fullMatch, tagName: string, rawAttributes = '', innerHtml: string) => {
      if (entryIndex >= numberedEntries.length) return fullMatch;

      const plainText = normalizeMatchKey(stripHtmlTags(innerHtml));
      const expected = normalizeMatchKey(numberedEntries[entryIndex].title);
      if (!plainText || !matchesOutlineText(plainText, expected)) return fullMatch;

      const entry = numberedEntries[entryIndex++];
      // Elimina cualquier número previo (----4, ····5, etc.)
      const cleanText = innerHtml.replace(/\s*[-–—·.~∿]+\s*\d+\s*$/, '').trim();
      
      // Construye la línea con puntos y número al final
      const leader = buildDotLeader(entry.level);
      const newInner = `${cleanText}${leader}${entry.firstPage}`;

      return `<${tagName}${rawAttributes}>${newInner}</${tagName}>`;
    },
  );
}
```

**Qué cambia:**
- Ya no usa `<span data-toc-*>`, escribe directamente el texto con puntos
- Respeta el HTML original (no crea líneas nuevas)
- Limpia cualquier formato previo de numeración

### C) Detectar si ya hay números

Añade al inicio de `buildSyncedTocChapterContent`:

```ts
export function hasTocPageNumbers(html: string): boolean {
  return /[·\-–—]{2,}\s*\d+\s*<\/(p|li|h[1-6])>/i.test(html);
}
```

Luego en `syncProjectPaginationAction` (ya lo tienes), la comparación `syncedHtml !== persistedTocHtml` evitará guardar si nada cambió.

---

## 3. Ajuste en `syncProjectPaginationAction`

No necesitas cambiar la lógica, solo asegurar que se llama después de importar. El código actual ya:

```ts
const syncedHtml = syncedToc.html;
if (tocChapter && syncedHtml !== persistedTocHtml) {
  await projectRepository.saveDocument(..., { content: syncedHtml });
}
```

Esto cumple:
- Si el índice no tiene números → `syncedHtml` (con números) ≠ `persisted` → guarda
- Si ya los tiene y no hay cambios → son iguales → no guarda
- Si añades un capítulo → la paginación cambia → `syncedHtml` cambia → guarda

---

## 4. Resultado con tu documento

**Antes de pulsar el botón (importación):**
```html
<p>Introducción: Activación de la Presencia</p>
<p>FASE 1: PERCEPCIÓN (Días 1-10) - Autoconciencia...</p>
```

**Después de pulsar "Actualizar numeración":**
```html
<p>Introducción: Activación de la Presencia··································4</p>
<p>FASE 1: PERCEPCIÓN (Días 1-10) - Autoconciencia...························5</p>
```

- Mismo número de líneas
- Puntos medios rellenando el espacio
- Número al final

Preview, PDF y DOCX mostrarán exactamente lo mismo porque leen del mismo HTML.

---

## 5. Prueba rápida

1. Aplica los cambios
2. Importa `Nunca_mas_en_la_sombra.docx`
3. Verifica que el Capítulo 2 no tiene números
4. Pulsa "Actualizar numeración"
5. Verifica que aparecen los puntos y números, sin duplicar líneas
6. Añade un capítulo nuevo → pulsa botón → todos los números se recalculan
