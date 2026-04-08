# Editor Multipágina Completo Para Capítulos

Fecha: 2026-04-08
Estado: proposed
Ámbito: `AdvancedRichTextEditor`, `useChapterEditor`, paginación editable de capítulos

## Objetivo

Convertir el editor de capítulos en una experiencia multipágina real, con un único flujo editable compartido por capítulo, donde el usuario pueda escribir directamente en cualquier página visible y donde la paginación sea una propiedad real del documento, no sólo de la preview.

## Resultado esperado

El usuario debe poder:

- escribir y mover el cursor directamente en cualquier página visible del capítulo
- insertar saltos de página manuales que fuercen cortes duros
- ver cómo el contenido genera páginas adicionales automáticamente al desbordar
- guardar el capítulo con saltos manuales y automáticos persistidos en el HTML
- reabrir el capítulo y recuperar la misma estructura de páginas

## Decisiones de producto

### Flujo de contenido

Cada capítulo usará un único documento editable compartido. No habrá un editor independiente por página.

Razón:

- mantiene una sola verdad del contenido
- conserva undo/redo, selección, pegado y formato cruzando páginas
- evita sincronización frágil entre páginas separadas
- replica mejor el modelo mental de Word

### Tipos de salto de página

Habrá dos tipos de salto persistido:

- manual: insertado por el usuario, fijo, nunca se mueve automáticamente
- auto: insertado por desborde, recalculable, puede moverse o eliminarse cuando cambia el contenido

Representación HTML propuesta:

```html
<hr data-page-break="manual" />
<hr data-page-break="auto" />
```

Compatibilidad:

- el HTML legado con `data-page-break="true"` se interpretará como salto manual durante la migración de comportamiento

### Regla de reflujo

- los saltos manuales fuerzan corte duro aunque dejen hueco libre
- los saltos automáticos se recalculan tras edición
- si el contenido crece, se insertan nuevos saltos automáticos
- si el contenido reduce el desborde, los saltos automáticos sobrantes se eliminan

## Estado actual

Hoy el sistema tiene:

- un único editor Tiptap por capítulo
- primera página editable
- páginas siguientes renderizadas como preview paginada
- paginador de preview que ya entiende `hr[data-page-break]`
- navegación de páginas basada en cálculo paginado, no en una superficie editable multipágina

Limitación principal:

la edición real no ocurre sobre una superficie multipágina; sólo la página inicial es editable y el resto son representaciones de preview.

## Arquitectura propuesta

### 1. Editor único con layout multipágina editable

`AdvancedRichTextEditor` seguirá teniendo una única instancia de Tiptap, pero la presentación visual del contenido se transformará en una secuencia de páginas reales.

Modelo:

- un contenedor raíz editable
- dentro, páginas visuales que forman parte del mismo flujo de edición
- el cursor se mueve naturalmente entre páginas porque todas pertenecen al mismo documento

No se crearán editores separados por página.

### 2. Motor de layout multipágina

Se añadirá una capa interna de layout que:

- mida el contenido renderizado por bloques
- determine cuándo un bloque desborda la altura útil de la página
- inserte saltos automáticos antes del bloque que desborda
- respete siempre los saltos manuales
- regenere la estructura de páginas desde el HTML actualizado

La fuente de verdad del layout será el documento del editor, no una copia de preview separada.

### 3. Reconciliación de saltos automáticos

Cada vez que cambie el contenido del capítulo:

1. se leen los saltos manuales existentes
2. se eliminan todos los saltos automáticos actuales del modelo temporal
3. se recalcula el layout por altura
4. se insertan nuevos saltos automáticos donde haga falta
5. se actualiza el HTML resultante del capítulo

Esto evita acumulación de cortes viejos y mantiene estable el documento.

### 4. Navegación y total de páginas

`useChapterEditor` dejará de depender de estimaciones por palabras cuando el layout editable esté disponible. El total de páginas se obtendrá del layout real del capítulo renderizado.

Consecuencia:

- la navegación entre páginas representará páginas reales del editor
- los saltos manuales y automáticos afectarán inmediatamente al total de páginas

## Modelo técnico

### Marca de salto de página

Se unificará la utilidad de saltos de página para soportar valores tipados:

- `manual`
- `auto`

Utilidades a actualizar:

- detección de saltos
- conteo de saltos
- normalización HTML
- borrado selectivo de saltos

### Compatibilidad con contenido legado

Durante la lectura:

- `data-page-break="true"` se tratará como `manual`

Durante la escritura nueva:

- sólo se emitirán `manual` y `auto`

### Regla de borrado

El botón de borrar salto debe eliminar el primer salto de página por debajo del cursor.

Política:

- si es manual, se elimina de forma persistente
- si es automático, también se elimina, pero puede reaparecer en el siguiente recálculo si el desborde sigue existiendo

Esto es coherente con el modelo de salto automático recalculable.

## Fases de implementación

### Fase 1. Tipado y utilidades de saltos

- ampliar `page-breaks.ts` para distinguir `manual` y `auto`
- mantener compatibilidad con `true`
- añadir tests de parsing, reemplazo y conteo

### Fase 2. Layout editable multipágina

- refactorizar `AdvancedRichTextEditor` para abandonar el patrón “primera página editable + resto preview”
- construir una superficie editable multipágina con un único editor
- renderizar todas las páginas visibles desde el mismo flujo

### Fase 3. Reflujo automático

- eliminar saltos `auto`
- medir desborde por página
- insertar nuevos saltos `auto`
- evitar bucles de actualización y jitter

### Fase 4. Integración con navegación y guardado

- adaptar `useChapterEditor`
- hacer que `totalPages` provenga del layout real
- guardar el HTML con marcas manuales y automáticas

### Fase 5. UX final

- distinguir visualmente saltos manuales y automáticos
- mejorar navegación entre páginas
- revisar borrado de saltos y comportamiento con selección/cursor

## Estrategia de pruebas

### Tests unitarios

- utilidades de saltos manuales/auto
- reconciliación de saltos automáticos
- normalización HTML

### Tests de integración del editor

- escribir en una página posterior sigue editando el mismo documento
- salto manual crea nueva página real
- desborde crea salto automático persistido
- reducir contenido elimina saltos automáticos sobrantes
- borrar salto manual lo elimina del HTML
- borrar salto automático lo elimina, pero el reflujo puede recrearlo

### Tests del hook

- `totalPages` deriva del layout real
- navegación entre páginas sigue el número real de páginas

## Riesgos

### Medición del desborde

Es la parte más sensible. Si la medición depende de timings inestables del DOM, puede producir:

- flicker
- bucles de re-render
- saltos automáticos que aparecen y desaparecen

Mitigación:

- recalcular en momentos controlados
- introducir guardas para no reescribir HTML si el resultado no cambia

### Selección y cursor

Mover contenido entre páginas visuales sin romper selección requiere que la paginación sea una presentación del mismo árbol, no varias islas editables.

### Alcance

Este cambio es una re-arquitectura del editor. No debe mezclarse con mejoras cosméticas ajenas durante la implementación.

## Fuera de alcance

- edición simultánea colaborativa
- comentarios por página
- cabeceras/pies avanzados por página
- numeración editorial configurable al estilo maquetación profesional

## Recomendación

Implementar el editor multipágina completo sobre un único flujo compartido y con dos tipos de salto persistido es la solución correcta para el usuario y la única que escala sin introducir inconsistencias estructurales.

El coste es mayor que mantener la preview híbrida actual, pero el resultado sí convierte la paginación en una funcionalidad central real del producto.
