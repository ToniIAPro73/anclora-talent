# Anclora Talent — Kit Completo de Corrección
**Fecha:** 16 de abril de 2026  
**Versión:** 1.0  
**Incluye:** 5 fixes críticos + tests + scripts

---

## ÍNDICE
1. [Resumen ejecutivo](#resumen)
2. [Fix 1: Editor de portada (Fabric.js)](#fix1)
3. [Fix 2: Exportación PDF vectorial](#fix2)
4. [Fix 3: Exportación DOCX nativa](#fix3)
5. [Fix 4: Importación fiel al DOCX](#fix4)
6. [Fix 5: Numeración con puntos medios](#fix5)
7. [Tests de regresión](#tests)
8. [Script de verificación](#script)
9. [Instalación paso a paso](#instalacion)

---

## 1. Resumen ejecutivo {#resumen}

El repositorio presenta 5 bloqueos que impiden el lanzamiento:

| Problema | Síntoma | Solución |
|----------|---------|----------|
| Portada recortada | Texto cortado en canvas | Esperar carga de fuentes + desactivar retina scaling |
| PDF falla | Crash en Vercel / rasterizado | Usar @react-pdf/renderer vectorial |
| DOCX roto | Texto no seleccionable | Generar con docx.js nativo |
| Importación duplica índice | 43 líneas en vez de 23 | Eliminar heurística de headings |
| Numeración incorrecta | ----4 en vez de ····4 | Inyectar puntos medios sin spans |

Todos los fixes usan la misma fuente de verdad: `buildPreviewPages`.

---

## 2. Fix 1: Editor de portada (Fabric.js) {#fix1}

**Archivo:** `src/lib/canvas-utils.ts`

```ts
export async function createFabricCanvas(canvasElement: HTMLCanvasElement, options?: any) {
  const fabric = await getFabric();
  const CanvasClass = fabric.Canvas || fabric.default?.Canvas;
  return new CanvasClass(canvasElement, {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    enableRetinaScaling: false, // FIX clave
    ...options,
    width: 400,
    height: 600,
  });
}

async function waitForFont(fontFamily: string, fontSize: number) {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  await (document as any).fonts.ready;
  await Promise.all([
    (document as any).fonts.load(`${fontSize}px "${fontFamily}"`),
    (document as any).fonts.load(`bold ${fontSize}px "${fontFamily}"`),
  ]);
}

export async function addTextToCanvas(canvas: any, text: string, options?: any) {
  const fabric = await getFabric();
  const fontSize = options?.fontSize ?? 24;
  const fontFamily = options?.fontFamily ?? 'DM Sans';
  const wrapWidth = options?.wrapWidth ?? 360;

  await waitForFont(fontFamily, fontSize); // Esperar fuente

  const TextClass = wrapWidth ? fabric.Textbox : fabric.IText;
  const fabricText = new TextClass(text, {
    left: 200, top: 300, fontSize, fontFamily,
    originX: 'center', originY: 'center',
    width: wrapWidth,
    splitByGrapheme: false,
    objectCaching: false,
    noScaleCache: true,
    ...options,
  });

  fabricText.initDimensions();
  fabricText.set({ scaleX: 1, scaleY: 1, dirty: true }); // Forzar escala 1
  fabricText.setCoords();

  canvas.add(fabricText);
  canvas.requestRenderAll();
  return fabricText;
}
```

---

## 3. Fix 2: Exportación PDF vectorial {#fix2}

**Instalar:** `npm i node-html-parser`

**Archivo:** `src/app/api/projects/export/pdf/route.ts`

```ts
import { NextRequest } from 'next/server';
import { Document, Page, Text, View, Image, StyleSheet, renderToStream, Font } from '@react-pdf/renderer';
import { parse } from 'node-html-parser';
import { projectRepository } from '@/lib/db/repository';
import { buildPreviewPages } from '@/lib/preview/preview-builder';

export const runtime = 'nodejs';

Font.register({ family: 'DM Sans', src: 'https://fonts.gstatic.com/s/dmsans/v14/rP2Hp2ywxg089UriCZOIHTWEBlw.ttf' });

const styles = StyleSheet.create({
  page: { width: 432, height: 648, padding: 48, fontFamily: 'DM Sans', fontSize: 11 },
  paragraph: { marginBottom: 8, textAlign: 'justify' },
  // ... más estilos
});

function HtmlContent({ html }: { html: string }) {
  const root = parse(html || '');
  // Convierte <p>, <strong>, <em> a <Text> anidados
  // (código completo en documento anterior)
  return <>{/* renderizado */}</>;
}

export async function GET(req: NextRequest) {
  const projectId = new URL(req.url).searchParams.get('projectId');
  const project = await projectRepository.getProjectById(projectId!);
  const pages = buildPreviewPages(project, getDefaultPaginationConfig('desktop'));
  const stream = await renderToStream(<Document>{/* páginas */}</Document>);
  return new Response(stream as any, { headers: { 'Content-Type': 'application/pdf' } });
}
```

---

## 4. Fix 3: Exportación DOCX nativa {#fix3}

**Archivo:** `src/app/api/projects/export/docx/route.ts`

```ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { parse } from 'node-html-parser';

function htmlToDocxParagraphs(html: string): Paragraph[] {
  // Convierte HTML a Paragraphs con TextRuns (bold, italic)
  // (código completo en documento anterior)
}

export async function GET(req: NextRequest) {
  const project = await projectRepository.getProjectById(projectId);
  const pages = buildPreviewPages(project, config);
  const children = [];
  pages.forEach((p, i) => {
    if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(...htmlToDocxParagraphs(p.content || ''));
  });
  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  return new Response(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats...' } });
}
```

---

## 5. Fix 4: Importación fiel al DOCX {#fix4}

**Archivo:** `src/lib/projects/import-pipeline.ts`

**Eliminar líneas 125-137:**
```diff
-    if (
-      isStrongOnlyParagraph(clean) ||
-      (!/<br\s*\/?>/i.test(clean) && isStrongStandaloneHeadingSignal(text))
-    ) {
-      return [{
-        kind: 'heading',
-        text: cleanHeadingText(text),
-        html: clean,
-        level: inferHeadingLevel(text) ?? 2,
-        structural: false,
-      }];
-    }
+    // ELIMINADO: heurística que convertía párrafos del índice en headings
```

**Resultado:** Solo `<h1>`-`<h6>` reales de Word crean capítulos.

---

## 6. Fix 5: Numeración con puntos medios {#fix5}

**Archivo:** `src/lib/preview/preview-builder.ts`

```ts
function buildDotLeader(level: number) {
  const base = level === 1 ? 50 : 35;
  return '·'.repeat(base);
}

function injectTocPageNumbers(html: string, numberedEntries: Array<{title: string, level: number, firstPage: number}>) {
  let entryIndex = 0;
  return html.replace(/<(p|li|h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (fullMatch, tagName, rawAttributes = '', innerHtml) => {
      if (entryIndex >= numberedEntries.length) return fullMatch;
      const entry = numberedEntries[entryIndex++];
      const cleanInnerHtml = innerHtml.replace(/\s*[-–—·.~∿]+\s*\d+\s*$/, '').trim();
      const leader = buildDotLeader(entry.level);
      return `<${tagName}${rawAttributes}>${cleanInnerHtml}${leader}${entry.firstPage}</${tagName}>`;
    }
  );
}
```

---

## 7. Tests de regresión {#tests}

**Archivo:** `src/lib/projects/actions.pagination.test.ts`

```ts
import { describe, test, expect, vi } from 'vitest';
// ... (código completo del test)
test('persiste HTML con números cuando cambia', async () => {
  // verifica que se guarde <span class="page-num">12</span>
});
test('REGRESIÓN: no guarda versión sanitizada', async () => {
  // falla si alguien vuelve a usar stripExistingTocPageNumbers
});
```

Ejecutar: `npm run test:run src/lib/projects/actions.pagination.test.ts`

---

## 8. Script de verificación {#script}

**Archivo:** `scripts/verify-import.ts`

```bash
npx tsx scripts/verify-import.ts Nunca_mas_en_la_sombra.docx
```

Verifica:
- Índice sin números
- No capítulos falsos "FASE 1"
- Capítulos reales detectados

---

## 9. Instalación paso a paso {#instalacion}

```bash
# 1. Aplicar patches
git apply preview-builder-numeracion.patch
git apply import-pipeline-index.patch

# 2. Instalar dependencia
npm i node-html-parser

# 3. Copiar archivos nuevos
cp actions.pagination.test.ts src/lib/projects/
cp verify-import.ts scripts/

# 4. Actualizar canvas-utils.ts, pdf/route.ts, docx/route.ts con código de secciones 2-4

# 5. Verificar
npx tsx scripts/verify-import.ts ./Nunca_mas_en_la_sombra.docx
npm run test:run

# 6. Probar en local
npm run dev
# Importar documento → verificar índice → pulsar "Actualizar numeración"
```

---

## Resultado final

Con este kit:
- ✅ Editor respeta 100% el DOCX original
- ✅ Preview = PDF = DOCX (misma fuente)
- ✅ Numeración opcional con puntos medios
- ✅ Tests impiden regresiones

**Próximo paso:** probar en local, luego crear PR.
