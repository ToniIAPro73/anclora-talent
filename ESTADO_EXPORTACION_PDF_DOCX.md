# Estado Actual de La Exportación a PDF y DOCX

## Objetivo

El objetivo del proceso de exportación es el siguiente:

- Cada página del documento exportado a `.pdf` y `.docx` debe coincidir con la página equivalente del preview.
- Esto incluye:
  - Portada
  - Páginas de contenido
  - Contraportada
- La coincidencia debe respetar:
  - Contenido textual
  - Orden de páginas
  - Posición visual de los elementos
  - Estilo visible en preview
  - Número total de páginas

En otras palabras, el preview debe ser la fuente de verdad visual del documento exportado.

## Situación Actual

En este momento:

- Los documentos `nunca.docx` y `nunca.pdf` generados en el raíz siguen saliendo mal.
- La exportación todavía no reproduce fielmente el preview.
- Ya se ha confirmado que el problema no está únicamente en la portada o la contraportada.
- También afecta al cuerpo del documento.

Estado actual por formato:

- `DOCX`:
  - Se detectó que algunas páginas se estaban reutilizando incorrectamente dentro del documento.
  - Tras los últimos cambios, un `DOCX` regenerado localmente ya no reutiliza la misma imagen repetidas veces.
  - Aun así, los `nunca.docx` del raíz siguen siendo exportaciones antiguas defectuosas y no deben tomarse como verificación del estado corregido del código.

- `PDF`:
  - Sigue siendo el formato más delicado.
  - Persisten problemas en la generación final.
  - Se ha comprobado que el fallo restante ya no nace en la paginación previa ni en la generación individual de imágenes por página, sino más abajo, en el empaquetado/render final del PDF.

## Síntomas Observados

Los errores detectados hasta ahora han sido:

- Portadas y contraportadas distintas al preview.
- Aparición de texto no esperado, como `ANCLORA TALENT`, en portadas exportadas.
- Posiciones de título y autor distintas al preview.
- Formatos de texto distintos al preview.
- En PDF, superposición de textos.
- En DOCX, páginas en blanco innecesarias.
- En versiones anteriores, una misma página del contenido se reutilizaba muchas veces en la exportación.
- El contenido exportado no coincidía página a página con el preview.

## Hallazgos Técnicos Confirmados

### 1. El preview del proyecto real sí genera páginas distintas

Se ha comprobado con el proyecto real:

- `projectId`: `eda536bd-028a-41c0-b472-8992b4fd8274`
- `workflow_step`: `9`
- `block_count`: `384`

Resultado:

- `buildExportPreview(project)` genera `44` páginas.
- Las páginas de contenido tienen hashes distintos entre sí.
- Esto indica que la paginación del preview, para ese proyecto, sí está distinguiendo correctamente las páginas.

Conclusión:

- El fallo ya no puede atribuirse únicamente a que el preview estuviera generando páginas duplicadas.

### 2. La rasterización previa de cada página de contenido también produce resultados distintos

Se verificó que, para el proyecto real:

- Cada página de contenido produce un `dataUrl` distinto en `buildContentPageExportImageDataUrl(...)`.
- Los hashes de imagen por página son distintos.

Conclusión:

- El fallo restante no nace en la generación individual de imágenes por página.
- El problema queda desplazado al ensamblado final del export, especialmente en PDF y en las referencias internas de DOCX/PDF.

### 3. Había una desalineación entre preview y exportación server-side

Se detectó un problema importante:

- La exportación server-side dependía de globals DOM que en Node.js no existen igual que en navegador.
- En particular, se estaba usando `Node.TEXT_NODE` directamente en la paginación server-side.
- Eso hacía que exportación y preview no compartieran exactamente la misma lógica real de paginado.

Conclusión:

- Aunque el preview del navegador se viera bien, la exportación podía degradarse porque no estaba usando el mismo runtime DOM.

## Cambios Realizados Hasta Ahora

### A. Unificación de la paginación del export con el preview

Se han realizado cambios en:

- [src/lib/preview/content-paginator.ts](/home/toni/projects/anclora-talent/src/lib/preview/content-paginator.ts)
- [src/lib/preview/editor-page-layout.ts](/home/toni/projects/anclora-talent/src/lib/preview/editor-page-layout.ts)

Cambios aplicados:

- Introducción de un runtime DOM compartido para navegador y server-side mediante `jsdom`.
- Eliminación de dependencias implícitas de globals como `Node` cuando el código se ejecuta en Node.js.
- Reutilización del mismo runtime DOM en la lógica de:
  - paginación
  - repaginación
  - reconciliación de saltos
  - detección de bloques sobredimensionados

Objetivo de estos cambios:

- Que exportación y preview utilicen exactamente la misma lógica de paginación.

### B. Corrección previa de exportación de imágenes de contenido

Antes de esta fase ya se habían aplicado varios cambios para acercar el export al preview:

- Se creó [src/lib/projects/export-content-blocks.ts](/home/toni/projects/anclora-talent/src/lib/projects/export-content-blocks.ts)
  - `parsePageContent`
  - `stripInlineHtml`
  - `decodeHtmlEntities`

- Se actualizó [src/lib/projects/export-builder.tsx](/home/toni/projects/anclora-talent/src/lib/projects/export-builder.tsx)
  - para usar el parser compartido de bloques de contenido

- Se actualizó [src/lib/projects/export-surface-image.ts](/home/toni/projects/anclora-talent/src/lib/projects/export-surface-image.ts)
  - eliminando la dependencia de `foreignObject`
  - renderizando las páginas de contenido como SVG nativo
  - generando imágenes de contenido más estables y diferenciadas

Objetivo de estos cambios:

- Evitar que varias páginas del contenido se convirtieran en la misma imagen.

### C. Pruebas automatizadas añadidas o reforzadas

Se han ejecutado y mantenido verdes pruebas sobre:

- [src/lib/projects/export-builder.test.ts](/home/toni/projects/anclora-talent/src/lib/projects/export-builder.test.ts)
- [src/lib/preview/content-paginator.test.ts](/home/toni/projects/anclora-talent/src/lib/preview/content-paginator.test.ts)
- [src/lib/preview/preview-builder.test.ts](/home/toni/projects/anclora-talent/src/lib/preview/preview-builder.test.ts)

Última verificación realizada:

- `44 passed`

Se añadió verificación para asegurar, entre otras cosas, que:

- El export se construye desde la misma pipeline del preview.
- Dos páginas de contenido distintas producen imágenes exportadas distintas.
- El HTML exportado no introduce texto sintético no deseado en el caso cubierto por test.

## Intentos Realizados Hasta Ahora

Resumen cronológico de los intentos hechos para resolver el problema:

1. Se revisó la exportación HTML/PDF/DOCX para entender si la portada y la contraportada se estaban construyendo desde una ruta distinta al preview.

2. Se detectó que había exportaciones que introducían texto sintético como `Anclora Talent`, aunque no estuviera presente visualmente en el preview final esperado.

3. Se revisó la estrategia de exportación de páginas de contenido y se observó que en versiones previas una misma imagen se estaba reutilizando varias veces.

4. Se sustituyó la generación basada en HTML embebido mediante `foreignObject` por renderizado SVG nativo para mejorar fidelidad y evitar colapsos silenciosos en el rasterizado.

5. Se unificó el parser de contenido de exportación para que HTML, PDF y DOCX partiesen de una misma interpretación estructural.

6. Se analizaron los archivos exportados reales:
  - `nunca.docx`
  - `nunca.pdf`

7. Se inspeccionó internamente el `DOCX`:
  - relaciones `rId`
  - imágenes embebidas
  - frecuencia de reutilización

8. Se comprobó que, antes de los últimos cambios, un mismo `rId` se reutilizaba muchas veces.

9. Se hizo una comprobación equivalente sobre el `PDF`, observando reutilización de una misma imagen en múltiples páginas.

10. Se creó un diagnóstico directo contra el proyecto real para:
  - cargar el proyecto desde base de datos
  - ejecutar `buildExportPreview(project)`
  - calcular hashes por página
  - verificar si las páginas previas ya salían duplicadas

11. Se comprobó que las páginas del preview eran distintas entre sí.

12. Se comprobó que las imágenes generadas por página también eran distintas entre sí.

13. Se localizó entonces el siguiente cuello de botella:
  - la exportación server-side no estaba usando exactamente el mismo runtime DOM que el preview

14. Se corrigió esa divergencia en `content-paginator.ts` y `editor-page-layout.ts`.

15. Tras esa corrección, se regeneró un `DOCX` local de diagnóstico y se verificó que:
  - ya no reutiliza un mismo recurso gráfico repetidamente
  - ahora contiene `44` dibujos únicos para `44` páginas

16. Se intentó hacer lo mismo con el `PDF`, pero el render final de `@react-pdf/renderer` todavía está fallando en local con:
  - `TypeError: Cannot read properties of undefined (reading 'S')`

## Estado de Verificación Actual

### Verificado como correcto

- El proyecto real puede cargarse correctamente desde base de datos.
- El preview exportable genera `44` páginas.
- Las páginas de contenido del preview son distintas.
- La imagen generada para cada página de contenido es distinta.
- El `DOCX` de diagnóstico generado tras la corrección ya no reutiliza la misma imagen repetidas veces.
- La suite de tests relevante está pasando.

### Pendiente de cerrar

- Regenerar oficialmente los documentos exportados tras esta corrección.
- Verificar visualmente que el nuevo `DOCX` coincide página a página con el preview.
- Resolver el fallo actual del render final del PDF con `@react-pdf/renderer`.
- Verificar que portada y contraportada exportadas coinciden con el preview.
- Confirmar que no se vuelve a introducir ningún texto sintético ajeno al preview.

## Riesgo Principal que Sigue Abierto

Ahora mismo el mayor riesgo ya no es la paginación previa, sino el ensamblado final:

- `DOCX`: hay que confirmar visualmente que el archivo regenerado coincide realmente con el preview, no sólo estructuralmente.
- `PDF`: todavía hay un fallo en el render final que impide darlo por resuelto.

## Próximo Paso Recomendado

El siguiente paso debe ser:

1. Regenerar exportaciones nuevas con el código actual.
2. Verificar el `DOCX` generado visualmente contra el preview.
3. Resolver el fallo de `react-pdf` para poder generar un `PDF` nuevo y fiable.
4. Comparar:
   - portada
   - contraportada
   - páginas intermedias
   - número total de páginas
5. No cerrar la tarea hasta que:
   - `PDF`
   - `DOCX`
   - `preview`

   representen exactamente el mismo documento.

## Resumen Ejecutivo

La situación actual es esta:

- Ya no estamos en una fase de tanteo general.
- La exportación ha mejorado y el problema se ha estrechado mucho.
- El preview y la exportación server-side estaban desalineados, y eso ya se ha corregido.
- El `DOCX` de diagnóstico posterior a esa corrección muestra señales claras de mejora real.
- El `PDF` sigue teniendo un problema adicional en su render final.
- Los archivos `nunca.docx` y `nunca.pdf` que están ahora en el raíz siguen siendo malos y no sirven como validación del estado actual del código.

El criterio final de éxito sigue siendo uno solo:

- Cada página exportada, incluida portada y contraportada, debe coincidir con la página correspondiente del preview.
