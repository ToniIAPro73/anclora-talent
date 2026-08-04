# Especificación técnica — Sistema Dual de Perfiles

**Módulo:** Aplicación de identidad y estructura a documentos
**Ecosistema:** Anclora Insights / Anclora Group
**Estado:** Propuesta v0.1 · Pendiente de validación técnica
**Fecha:** 2026-08-04

---

## I. Objetivo

El sistema deberá permitir al usuario aplicar, de forma independiente y combinable, dos tipos de perfil sobre cualquier documento en creación:

1. **Perfil de marca** — identidad visual y verbal (color, tipografía, tono).
2. **Perfil de estructura** — jerarquía, secuencia narrativa y patrones de composición.

Ambos perfiles deberán operar de forma desacoplada. El usuario podrá aplicar uno, otro, ambos, o ninguno.

---

## II. Principio de separación

| Criterio | Perfil de marca | Perfil de estructura |
|---|---|---|
| Objeto capturado | Color, tipografía, léxico, reglas de voz | Jerarquía de encabezados, secuencia de partes, patrones de apertura/cierre |
| Fuente de extracción | Manual de identidad (reglas explícitas) | Documento real (patrón implícito, requiere inferencia) |
| Determinismo | Alto — validable por hex, pt, familia tipográfica | Medio — requiere confirmación humana del patrón inferido |
| Riesgo principal | Baja fidelidad visual | Arrastre no deseado de voz o contenido del autor original |

**Regla de gobernanza:** un extractor no deberá invadir el dominio del otro. El extractor estructural no capturará tono ni léxico; el extractor de marca no capturará jerarquía documental.

---

## III. Flujo operativo

1. El usuario carga el documento a redactar o reestructurar.
2. El sistema presentará dos selectores independientes:
   - `Aplicar identidad de marca` → selección de perfil de marca guardado (opcional).
   - `Aplicar estructura de referencia` → carga de documento de referencia o selección de perfil estructural guardado (opcional).
3. Si se activa el perfil de estructura, el sistema ejecutará el extractor y presentará el esquema inferido para confirmación previa a la generación. **No se aplicará estructura sin confirmación explícita del usuario.**
4. El sistema generará el documento combinando los perfiles activos.

---

## IV. Esquema de perfil de estructura (referencia)

El extractor estructural deberá producir un objeto con los siguientes campos mínimos:

- `hierarchy` — profundidad de niveles y mapeo a encabezados (H1/H2/H3).
- `macro_pattern` — secuencia de partes y función retórica de cada una.
- `chapter_pattern` — patrón de apertura y cierre de capítulo, con ejemplos.
- `enumeration_style` — regla de activación y formato de numeración taxonómica.
- `table_usage` — regla de activación de tablas (nunca decorativa).
- `voice_scope_note` — declaración explícita de que el perfil no transfiere voz.

Véase `structure_profile_exito_sin_compania.json` como implementación de referencia, extraída de *Éxito sin compañía*.

---

## V. Reglas mínimas de aplicación

1. **Confirmación obligatoria.** Ningún perfil estructural se aplicará sin revisión humana del esquema inferido.
2. **No sobreajuste de voz.** El extractor estructural descartará cualquier señal léxica o tonal; esa función pertenece exclusivamente al perfil de marca.
3. **Perfiles versionados.** Cada perfil, de marca o de estructura, se almacenará con identificador y versión, siguiendo el mismo patrón de gobernanza ya establecido en los contratos de Anclora.
4. **Independencia funcional.** La ausencia de un perfil de marca no bloqueará la aplicación de un perfil de estructura, y viceversa.
5. **Trazabilidad de origen.** Todo perfil estructural deberá registrar el documento fuente del que fue inferido, para auditoría posterior.

---

## VI. Próximos pasos técnicos

1. Definir el extractor estructural (heurística de encabezados + patrón de apertura/cierre por capítulo).
2. Definir el extractor de marca (ya cubierto por el Manual de Identidad de Anclora Insights v3.0 como caso de prueba).
3. Prototipar el motor de generación combinada sobre un documento de prueba con ambos perfiles activos.
4. Establecer el repositorio de perfiles versionados dentro de la Bóveda de Anclora.

---

**Anclora Group** · Documento de uso interno
