# Cover Editor Coherence and Template System Design

## Goal

Unificar portada básica, portada avanzada, contraportada básica, contraportada avanzada, preview y export para que trabajen sobre una única fuente de verdad editorial, con paridad funcional real entre portada y contraportada avanzadas y con un sistema de plantillas más amplio y separado por tipo.

## Problem Summary

El estado actual presenta varios fallos de producto:

- el editor básico y el avanzado no representan ni guardan exactamente la misma portada
- la contraportada avanzada no tiene la misma capacidad que la portada avanzada
- el editor avanzado de portada no está mostrando una composición final fiable; el canvas y la retícula no corresponden con una portada editorial real
- campos vacíos u ocultos, como el subtítulo, reaparecen o dejan inconsistencias entre pantallas
- el paso de plantillas es demasiado limitado y mezcla una idea de plantilla cosmética con una de composición editorial
- preview y export pueden divergir de lo que el usuario ha diseñado en portada/contraportada

## Desired Product Behavior

### Unified editorial state

Portada y contraportada deben definirse por un estado editorial único y persistible. Ese estado debe ser la única fuente de verdad para:

- editor básico
- editor avanzado
- preview
- exportación
- render final guardado

Debe existir una distinción clara entre:

- valor del campo
- visibilidad del campo
- composición visual

Ejemplo: un subtítulo puede seguir existiendo como dato o quedar vacío, pero si se vacía o se marca como no visible, no debe reaparecer en otra pantalla ni en preview/export tras guardar.

### Draft local vs persisted state

Dentro de la pantalla actual, los cambios deben reflejarse en vivo entre paneles y previsualizaciones.

Fuera de esa pantalla, la aplicación sólo debe ver los cambios cuando el usuario guarda.

Esto exige:

- estado local compartido dentro del flujo de edición de portada o contraportada
- persistencia explícita al guardar
- protección contra formularios simplificados que sobrescriban propiedades avanzadas por accidente

### Advanced editor parity

La contraportada avanzada debe ofrecer el mismo motor y las mismas capacidades que la portada avanzada:

- capas de texto
- capas de imagen
- selección de capa
- posición y tamaño
- tipografía
- alineación
- color
- interlineado
- espaciado entre letras
- duplicar, eliminar, undo/redo
- render final

La diferencia entre portada y contraportada debe estar en presets, plantillas y defaults, no en tener dos motores distintos.

### Responsive composition without dead space

Cuando falte un campo visible, el layout debe recomponerse automáticamente.

No se deben reservar huecos rígidos para elementos ausentes. La portada o contraportada debe seguir viéndose editorialmente correcta aunque falten subtítulo, imagen secundaria o textos de apoyo.

## Recommended Architecture

## 1. Shared cover surface model

Introducir un modelo común de superficie editorial para portada y contraportada.

Ese modelo debe poder expresar:

- dimensiones del lienzo
- fondo
- capas
- orden de apilado
- contenido textual
- propiedades tipográficas
- propiedades geométricas
- visibilidad
- metadatos de plantilla aplicada

Este modelo será el contrato común que consumen:

- `CoverForm`
- `AdvancedCoverEditor`
- `BackCoverForm`
- `AdvancedBackCoverEditor`
- preview builder / preview modal
- export pipeline

La UI básica no debe construir un objeto alternativo. Debe editar una proyección simplificada del mismo modelo.

## 2. One engine, two surfaces

Portada avanzada y contraportada avanzada deben usar el mismo motor de canvas y edición.

Lo correcto es factorizar un editor base compartido y pasarle:

- el tipo de superficie: `cover` o `back-cover`
- la plantilla activa
- los defaults de composición
- los campos disponibles por contexto

La portada y la contraportada seguirán teniendo identidades editoriales distintas, pero no implementaciones divergentes.

## 3. Basic editor as a simplified projection

El editor básico debe ser una vista reducida sobre el mismo estado compartido.

Debe exponer sólo lo esencial:

- título
- subtítulo
- autor o bio, según superficie
- imagen/fondo
- plantilla seleccionada
- algunos toggles de visibilidad relevantes

Pero nunca debe:

- resetear propiedades avanzadas silenciosamente
- reintroducir texto que fue eliminado
- volver a defaults incompatibles con lo guardado

## 4. Template system split by surface

Las plantillas deben dividirse explícitamente en:

- plantillas de portada
- plantillas de contraportada

Cada plantilla debe definir:

- identificador estable
- superficie objetivo
- categoría editorial
- layout base
- visibilidad recomendada de campos
- tipografías base
- paleta / contraste
- reglas de imagen
- capas iniciales

Cambiar de plantilla debe:

- conservar textos e imágenes del usuario
- aplicar nueva composición
- sugerir visibilidad adecuada
- no borrar contenido

## Template Categories

Se recomienda introducir, como mínimo, estas familias:

- Ensayo premium
- Negocio / liderazgo
- WorkBook / guía práctica
- Ficción literaria
- Minimal editorial
- Memoria / autobiografía
- High contrast statement

Cada familia debe tener al menos una variante de portada y una de contraportada. No es necesario que ambas sean simétricas.

## 5. Final render fidelity

El render final guardado debe salir del mismo modelo que el editor avanzado.

Preview y export deben preferir la imagen renderizada final cuando exista, pero esa imagen debe generarse a partir del estado unificado, no de una representación paralela.

Esto elimina diferencias entre:

- lo que el usuario ve en el canvas
- lo que guarda
- lo que aparece en preview
- lo que sale en export

## UX Rules

### Field behavior

- si el usuario vacía un campo, el campo queda vacío
- si el usuario oculta un campo, deja de mostrarse
- si el campo está vacío u oculto, no debe aparecer en ninguna otra pantalla tras guardar
- si el usuario cambia de plantilla, los campos se conservan

### Layout behavior

- los layouts deben recompactarse al faltar elementos
- el canvas debe representar una portada o contraportada final creíble, no una mesa de objetos sin retícula
- la imagen de fondo o principal debe ocupar el espacio según la plantilla, no con escalados arbitrarios

### Editor switching

Cambiar entre básico y avanzado en una misma superficie no debe cambiar el resultado visual salvo en las propiedades que el usuario modifique explícitamente.

### Save semantics

- edición en vivo dentro de la pantalla actual
- propagación al resto de la app sólo al guardar

## Scope of This Work

Incluido en esta ronda:

- unificación del modelo entre básico y avanzado
- paridad funcional avanzada entre portada y contraportada
- corrección de la representación del canvas avanzado
- separación y ampliación del sistema de plantillas
- coherencia entre edición, preview y export

Fuera de alcance en esta ronda:

- sistema de snapping complejo o guías magnéticas avanzadas
- edición de lomo o cubierta completa
- efectos gráficos complejos tipo máscara avanzada o blending profesional

## Risks

### Silent data overwrites

El mayor riesgo es que el editor básico siga serializando sólo una parte del estado y pise propiedades del avanzado. La solución es que ambos editen el mismo modelo y que el básico haga updates parciales.

### Migration of existing projects

Los proyectos ya creados pueden carecer de parte del nuevo modelo compartido. Habrá que definir defaults y una migración ligera en carga para no romper cubiertas ya existentes.

### Template application side effects

Aplicar plantillas no debe reescribir datos del usuario. El sistema debe distinguir claramente entre contenido persistente y presets de composición.

## Testing Strategy

Debe cubrirse, como mínimo:

- cambio entre editor básico y avanzado sin pérdida de coherencia
- ocultar o vaciar subtítulo y verificar que no reaparece tras guardar
- contraportada avanzada con las mismas herramientas que portada avanzada
- cambio de plantilla conservando contenido
- preview y export leyendo el mismo estado guardado
- plantillas separadas por superficie

## Success Criteria

La ronda se considerará correcta cuando:

- portada básica y avanzada produzcan la misma portada guardada
- contraportada básica y avanzada produzcan la misma contraportada guardada
- portada avanzada y contraportada avanzada tengan paridad funcional real
- el canvas avanzado represente composiciones editoriales creíbles
- campos vacíos u ocultos no reaparezcan en otras pantallas
- preview y export coincidan con lo guardado
- el paso de plantillas ofrezca variedad real y separada para portada y contraportada
