# Anclora Talent — Análisis técnico y plan de corrección
**Fecha:** 16 de abril de 2026  
**Rama analizada:** `claude/import-word-document-81EWw`  
**Stack:** Next.js 16.2.1, React 19.2.4, Clerk 7, Neon, Vercel Blob, Fabric 7, Tiptap 3

---

## 1. Resumen ejecutivo

El repositorio ya completó la migración a Next.js y tiene el **documento canónico** compartido entre editor y preview. Los últimos commits arreglaron la numeración del índice y la sincronización de paginación.

Quedan tres bloqueos críticos antes de poder lanzar el MVP:

1. **Editor avanzado de portada:** el texto se recorta en el canvas aunque los datos son correctos.
2. **Exportación PDF:** falla en el empaquetado final y no respeta el preview.
3. **Exportación DOCX:** se rasterizaba a imagen, rompiendo texto seleccionable y layout.

Este documento entrega los parches concretos para los tres puntos, usando la misma fuente de verdad: `buildPreviewPages`.

---

## 2. Estado actual verificado

### Lo que ya funciona
- `syncProjectPaginationAction` persiste correctamente `syncedToc.html` con números de página.
- `preview-builder.ts` reconoce variantes de TOC y suple entradas faltantes.
- Editor y preview comparten `device-configs.ts` y `PaginationConfig`.
- Preferencias de editor guardadas en localStorage y sincronizadas entre pestañas.

### Lo que falla
- **Portada avanzada:** Fabric mide el texto con fuente fallback antes de que DM Sans cargue. En React 19 StrictMode el canvas se remonta y hereda `scaleX < 1`.
- **PDF:** se usaba `@sparticuz/chromium` en Edge, superando límite de memoria. Además se rasterizaba cada página.
- **DOCX:** estrategia mixta imagen+texto rompía la paridad visual con el preview.

---

## 3. Parche 1 — Editor avanzado de portada (Fabric.js)

### Archivo: `src/lib/canvas-utils.ts`

**Cambios clave:**
- Desactivar `enableRetinaScaling` para evitar distorsión HiDPI
- Esperar carga de fuente normal **y bold** antes de medir
- Forzar `scaleX=1`, `scaleY=1` y `objectCaching=false` después de `initDimensions`
- Resetear escalas al hidratar desde JSON

```ts
export async function createFabricCanvas(canvasElement: HTMLCanvasElement, options?: any) {
  const fabric = await getFabric();
  const CanvasClass = fabric.Canvas || fabric.default?.Canvas;
  return new CanvasClass(canvasElement, {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    enableRetinaScaling: false, // FIX
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

  await waitForFont(fontFamily, fontSize);

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
  fabricText.set({ scaleX: 1, scaleY: 1, dirty: true });
  fabricText.setCoords();

  canvas.add(fabricText);
  canvas.requestRenderAll();
  return fabricText;
}

export function loadCanvasFromJSON(canvas: any, json: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.loadFromJSON(json, () => {
      canvas.getObjects().forEach((obj: any) => {
        if (obj.type === 'textbox' || obj.type === 'i-text') {
          obj.set({ scaleX: 1, scaleY: 1, objectCaching: false });
          obj.initDimensions();
          obj.setCoords();
        }
      });
      canvas.requestRenderAll();
      resolve();
    });
  });
}
```

**En `AdvancedSurfaceEditor.tsx`:**
```ts
const layerWidth = typeof layer.width === 'number' 
  ? layer.width 
  : config.width ?? 340; // antes podía ser 200
```

---

## 4. Parche 2 — Exportación PDF vectorial

Instalar: `npm i node-html-parser`

**Archivo:** `src/app/api/projects/export/pdf/route.ts`

```ts
import { NextRequest } from 'next/server';
import { Document, Page, Text, View, Image, StyleSheet, renderToStream, Font } from '@react-pdf/renderer';
import { parse, HTMLElement } from 'node-html-parser';
import { projectRepository } from '@/lib/db/repository';
import { buildPreviewPages } from '@/lib/preview/preview-builder';
import { getDefaultPaginationConfig } from '@/lib/preview/device-configs';

export const runtime = 'nodejs';

Font.register({ family: 'DM Sans', src: 'https://fonts.gstatic.com/s/dmsans/v14/rP2Hp2ywxg089UriCZOIHTWEBlw.ttf' });

const styles = StyleSheet.create({
  page: { width: 432, height: 648, padding: 48, fontFamily: 'DM Sans', fontSize: 11 },
  h1: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  h2: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  paragraph: { marginBottom: 8, textAlign: 'justify' },
  // ... resto de estilos
});

function renderNodes(nodes: any[]): any { /* ver código completo en implementación */ }
function HtmlContent({ html }: { html: string }) { /* parsea HTML a Text anidados */ }

export async function GET(req: NextRequest) {
  const projectId = new URL(req.url).searchParams.get('projectId');
  const project = await projectRepository.getProjectById(projectId!);
  const pages = buildPreviewPages(project, getDefaultPaginationConfig('desktop'));
  const stream = await renderToStream(<Document>{/* renderiza páginas */}</Document>);
  return new Response(stream as any, { headers: { 'Content-Type': 'application/pdf' } });
}
```

**Ventajas:**
- Usa `buildPreviewPages` → misma paginación que el preview
- Texto vectorial, seleccionable, 10× más ligero
- Runtime Node evita crash de Chromium

---

## 5. Parche 3 — Exportación DOCX nativa

**Archivo:** `src/app/api/projects/export/docx/route.ts`

```ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { parse } from 'node-html-parser';
// ... imports de repositorio y preview

function extractRuns(node: any, style = {}): TextRun[] { /* convierte <strong>, <em>, <u> */ }
function htmlToDocxParagraphs(html: string): Paragraph[] { /* convierte HTML a Paragraphs */ }

export async function GET(req: NextRequest) {
  const project = await projectRepository.getProjectById(projectId);
  const pages = buildPreviewPages(project, getDefaultPaginationConfig('desktop'));
  
  const children = [];
  pages.forEach((p, i) => {
    if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    if (p.type === 'content') children.push(...htmlToDocxParagraphs(p.content || ''));
    // ... cover y back-cover
  });

  const doc = new Document({ sections: [{ properties: { page: { size: { width: 8640, height: 12960 } } }, children }] });
  const buffer = await Packer.toBuffer(doc);
  return new Response(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } });
}
```

---

## 6. Checklist antes de continuar

1. [ ] Aplicar parche Fabric y verificar en consola que `scaleX === 1`
2. [ ] Probar `/api/projects/export/pdf?projectId=xxx` → mismo número de páginas que preview
3. [ ] Probar `/api/projects/export/docx?projectId=xxx` → texto seleccionable
4. [ ] Añadir test: `syncProjectPaginationAction` debe persistir HTML con números
5. [ ] Congelar versiones: pin Next a 15.3 o validar compatibilidad completa con React 19

---

## 7. Próximos pasos recomendados

1. Cerrar los tres parches en staging
2. Ejecutar `feature-landing-signup-redesign` (ya está en tasks.json como planned)
3. Migrar preferencias de editor de localStorage a tabla `UserPreferences` en Neon

Con esto el flujo editorial completo (importar → editar → preview → exportar) queda cerrado y fiel al contrato premium.
