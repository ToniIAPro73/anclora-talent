# Estado actual del editor avanzado de portada

## Resumen ejecutivo

El editor avanzado de portada sigue presentando un problema crítico de renderizado de texto.

Situación actual:

- La imagen de fondo ya se muestra completa dentro del lienzo.
- El contenido textual sí existe y sí llega al editor.
- El panel de propiedades muestra el texto completo correctamente.
- Sin embargo, en el canvas visual el título y otros textos aparecen recortados o comprimidos dentro de una caja demasiado estrecha.
- El problema persiste tras múltiples cambios en la lógica de datos, la reconstrucción del estado visual y la capa de renderizado de Fabric.

Estado práctico a día de hoy:

- El editor avanzado de portada no está funcionalmente resuelto.
- La parte visual de texto sigue siendo inconsistente respecto al editor básico.
- Los cambios aplicados hasta ahora no han eliminado el fallo en staging.

## Síntoma actual observado

En el editor avanzado de portada:

- El título aparece truncado visualmente.
- La caja de selección del texto es visiblemente más estrecha de lo esperado.
- El texto completo, por ejemplo `NUNCA MÁS EN LA SOMBRA`, aparece correctamente en el panel lateral de propiedades.
- A pesar de ello, en el canvas solo se ve una parte del contenido, por ejemplo `NUNCA M` y `SOM`.
- Esto indica que el fallo no está en la carga del contenido textual sino en su representación visual dentro del canvas.

## Diferencia entre editor básico y avanzado

Editor básico:

- Muestra correctamente título, subtítulo y autor.
- Usa una representación visual coherente con el contenido persistido.
- Sirve como referencia del comportamiento esperado.

Editor avanzado:

- Ha llegado a mostrar la imagen correctamente.
- Sigue fallando en la representación del texto.
- No mantiene paridad visual con el editor básico.

## Estado técnico actual

Lo que sí parece confirmado:

- El problema principal ya no es de imagen.
- El problema principal ya no parece ser de carga vacía del texto.
- El contenido sí existe en memoria cuando el editor avanzado monta los elementos.
- El problema está concentrado en la capa de render del texto del canvas avanzado.

Hipótesis más fuerte en este momento:

- El objeto de texto que termina renderizando Fabric en el editor avanzado no está respetando correctamente el ancho, el ajuste de líneas o la geometría real del texto.
- Hay una discrepancia entre el texto lógico y la caja visual usada por el canvas.

## Cambios realizados hasta ahora sin resultado definitivo

### 1. Sincronización entre editor básico y avanzado

Se implementó un borrador compartido en el workspace para evitar que el editor avanzado trabajase con datos obsoletos cuando el usuario cambiaba desde el editor básico.

Cambios aplicados:

- Control de `surface` y `palette` en `CoverForm`.
- Draft compartido en `ProjectWorkspace`.
- Inyección del draft actual en `AdvancedCoverEditor`.

Resultado:

- Mejoró la consistencia entre básico y avanzado dentro de la sesión.
- No resolvió el recorte visual del texto.

## 2. Reconstrucción del estado de portada desde datos persistidos

Se revisó la función de snapshot del editor avanzado para que no dependiera exclusivamente de `surfaceState` viejo o incompleto.

Cambios aplicados:

- Prioridad de valores planos actuales de portada frente a valores antiguos de `surfaceState`.
- Reconstrucción de capas visibles cuando faltaban capas persistidas.
- Reconciliación de `title`, `subtitle` y `author` con el proyecto actual.

Archivos afectados:

- `src/components/projects/advanced-cover/advanced-surface-utils.ts`
- tests asociados del mismo módulo

Resultado:

- Mejoró la coherencia del contenido reconstruido.
- No eliminó el recorte del texto en staging.

## 3. Persistencia del estado textual al guardar el diseño final

Se detectó que el editor avanzado estaba guardando la imagen renderizada final, pero no siempre persistía primero el estado textual actual.

Cambios aplicados:

- Antes de generar el PNG final, se persiste el estado actual del texto del editor avanzado.
- Se añadieron llamadas de guardado de portada y contraportada antes del render final.

Archivo afectado:

- `src/components/projects/advanced-cover/AdvancedSurfaceEditor.tsx`

Resultado:

- Corrigió parcialmente la coherencia entre contenido editado y contenido persistido.
- No resolvió el problema visual del recorte de texto.

## 4. Sustitución del fondo persistido de Fabric por capa DOM

Se cambió el tratamiento de la imagen de fondo para reducir interferencias dentro del canvas y acercar el render final a lo que el usuario ve.

Cambios aplicados:

- El fondo se pasó a una capa DOM en `Canvas.tsx`.
- El canvas pasó a ser transparente sobre esa capa.
- La exportación final usa `html-to-image` sobre la composición DOM.
- Se creó un proxy de fondo para mantener selección y edición conceptual del background.

Archivos afectados:

- `src/components/projects/advanced-cover/Canvas.tsx`
- `src/components/projects/advanced-cover/AdvancedSurfaceEditor.tsx`
- `src/lib/canvas-store.ts`
- `src/components/projects/advanced-cover/PropertyPanel.tsx`

Resultado:

- La imagen dejó de salir cortada.
- El problema de texto siguió intacto.

## 5. Normalización de render de imágenes en Fabric

Se reforzó la carga de imágenes para evitar medidas `undefined` y escalados incorrectos en Fabric 7.

Cambios aplicados:

- Cálculo explícito del tamaño fuente de imagen.
- Corrección del escalado `contain` y `cover`.
- Normalización de `width` y `height` antes del render.

Archivo afectado:

- `src/lib/canvas-utils.ts`

Resultado:

- Útil para imágenes y otras inserciones.
- Sin impacto resolutivo sobre el recorte del texto de portada.

## 6. Ajustes sobre `Textbox` de Fabric

Se intentó resolver el fallo en la propia caja de texto de Fabric.

Cambios aplicados:

- Desactivación de `objectCaching`.
- Uso de `noScaleCache`.
- Forzado de `scaleX` y `scaleY` a `1`.
- Llamadas explícitas a `initDimensions()`.
- Llamadas explícitas a `setCoords()`.
- Reaplicación de `width` y `minWidth`.
- Fijación de `minWidth` al ancho editorial esperado.
- Refuerzo de estos recálculos también en `updateElement`.

Archivos afectados:

- `src/lib/canvas-utils.ts`
- `src/lib/canvas-store.ts`

Resultado:

- No produjo cambio visible en staging.
- El texto siguió recortado exactamente con el mismo patrón.

## 7. Cambio de estrategia: texto preenvuelto en lugar de `Textbox`

Al no haber resultado con la caja de texto de Fabric, se abrió una nueva línea técnica para evitar depender de `Textbox`.

Cambios aplicados:

- Se añadió una utilidad de ajuste de líneas por anchura (`wrapTextToWidth`).
- Los textos editoriales precargados pasaron a usar `wrapWidth` en vez de `width`.
- Se introdujo almacenamiento de `rawText` para conservar el contenido completo aunque la representación visible sea multilinea.
- El panel de propiedades se adaptó para mostrar `rawText`.
- La actualización de elementos se adaptó para recalcular el texto envuelto.

Archivos afectados:

- `src/lib/canvas-utils.ts`
- `src/lib/canvas-store.ts`
- `src/components/projects/advanced-cover/PropertyPanel.tsx`
- `src/components/projects/advanced-cover/AdvancedSurfaceEditor.tsx`

Resultado:

- A nivel de código fue un cambio de enfoque real.
- En el momento de redactar este documento, el usuario seguía reportando que en staging no había cambio visible.
- Por tanto, tampoco puede considerarse resuelto.

## Evidencia funcional actual

Lo que muestran las capturas más recientes:

- El título sigue visualmente recortado.
- El cuadro de selección del texto sigue teniendo una anchura anómala.
- El panel de propiedades muestra el contenido completo.
- La imagen sí se ve correctamente.
- No hay errores claros en consola que expliquen por sí solos el fallo.

## Pruebas ejecutadas

Durante el proceso se han mantenido y ampliado pruebas automáticas sobre:

- snapshot del estado de superficie
- sincronización entre editor básico y avanzado
- persistencia del estado de portada
- exportación/render final
- utilidades de canvas

Resultado general de esas pruebas:

- La suite relevante ha pasado repetidamente en local.
- Esto confirma consistencia lógica en varias capas.
- No confirma el comportamiento visual real en staging.

Conclusión de este punto:

- El fallo es compatible con un problema de render visual específico del entorno de navegador/canvas.
- Las pruebas actuales no están cubriendo el bug real que el usuario ve.

## Conclusión

El estado actual del editor avanzado de portada es el siguiente:

- La parte de imagen está sensiblemente mejorada y funcional.
- La parte de texto sigue sin estar resuelta.
- El sistema carga el contenido textual, pero lo representa visualmente de forma incorrecta.
- Ya se han probado varias líneas de corrección sin resultado satisfactorio en staging.

En otras palabras:

- El problema no puede darse por resuelto.
- El editor avanzado de portada sigue teniendo una regresión visible importante.

## Siguiente paso recomendado

El siguiente paso recomendable no es seguir aplicando más ajustes genéricos sobre Fabric sin observabilidad.

La siguiente intervención debería ser:

1. Instrumentar temporalmente el montaje del objeto de texto real en staging.
2. Registrar en consola los valores efectivos de:
   - tipo de objeto real
   - `text`
   - `rawText`
   - `width`
   - `minWidth`
   - `height`
   - `scaleX`
   - `scaleY`
   - líneas internas calculadas
   - coordenadas y origen
3. Confirmar si el objeto visual final es realmente `Textbox`, `IText` o `Text`.
4. Verificar si otra parte del editor está reescribiendo dimensiones después del montaje.
5. Solo después de esa observación, aplicar una corrección final dirigida.

## Intervención realizada: instrumentación + carga de fuentes

Se ha implementado la instrumentación recomendada en `src/lib/canvas-utils.ts`:

### Cambios aplicados

1. **Función `waitForFont`**: espera a que la fuente esté cargada en el navegador antes de crear el objeto de texto, usando la Font Loading API del navegador.

2. **Instrumentación en tres fases**:
   - **Antes de initDimensions**: registra todos los valores iniciales del objeto (tipo, text, rawText, width, minWidth, height, scaleX, scaleY, lines, lineCount, coordenadas, origen, fontSize, fontFamily).
   - **Después de initDimensions**: verifica width, minWidth, height, scaleX, scaleY, lines y lineCount tras el recálculo de dimensiones.
   - **Después de render** (100ms timeout): verifica width, height, scaleX, scaleY, oCoords y aCoords tras añadir al canvas.

3. **Corrección proactiva de ancho**: si el ancho calculado es menor al 90% del `wrapWidth` esperado, se fuerza explícitamente el ancho y se vuelve a llamar a `initDimensions()`.

4. **Reset explícito de escalado**: se asegura `scaleX: 1` y `scaleY: 1` para evitar distorsión por escalado acumulado.

### Archivos afectados

- `src/lib/canvas-utils.ts`

### Resultado esperado

Esta instrumentación permitirá:
- Identificar si el problema está en la medición inicial de dimensiones.
- Detectar si hay un problema de escalado posterior.
- Verificar si las líneas internas se calculan correctamente.
- Confirmar si el ancho real coincide con el `wrapWidth` especificado.
- Obtener evidencia concreta del comportamiento en staging para dirigir la corrección final.

### Próximos pasos

1. Desplegar a staging.
2. Abrir consola del navegador y editar una portada en el editor avanzado.
3. Recopilar los logs de `[addTextToCanvas]` para analizar:
   - Si `width` es significativamente menor que `wrapWidth`.
   - Si `lines` tiene el número esperado de líneas.
   - Si `scaleX` o `scaleY` son diferentes de 1.
   - Si hay discrepancia entre las medidas antes y después del render.
4. Con esos datos, aplicar la corrección específica que resuelva el recorte.

## Archivos más implicados hasta ahora

- `src/components/projects/CoverForm.tsx`
- `src/components/projects/ProjectWorkspace.tsx`
- `src/components/projects/advanced-cover/AdvancedSurfaceEditor.tsx`
- `src/components/projects/advanced-cover/Canvas.tsx`
- `src/components/projects/advanced-cover/advanced-surface-utils.ts`
- `src/components/projects/advanced-cover/PropertyPanel.tsx`
- `src/lib/canvas-utils.ts`
- `src/lib/canvas-store.ts`

## Estado final del incidente

Estado: abierto

Impacto:

- El editor avanzado de portada no es fiable para edición visual de texto.
- El resultado percibido por el usuario sigue siendo incorrecto.
- El bloqueo funcional continúa.
