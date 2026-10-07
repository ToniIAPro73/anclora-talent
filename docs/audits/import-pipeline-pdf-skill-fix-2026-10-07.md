# Anclora Talent y skill de conversión PDF — corrección y validación integral

**Fecha**: 2026-10-07
**Rama**: `development` (sin ramas nuevas creadas)
**Commits**: `19452d7`, `adb187f` (push autorizado explícitamente por el usuario durante la sesión, revocando la restricción inicial de "sin push"; no se promovió a `staging`/`production`/`main`, no hubo despliegue)
**Entorno de ejecución**: contenedor en la nube con clon de `ToniIAPro73/anclora-talent`; sin acceso al repositorio local del usuario en `/Users/toni/Developer/anclora/anclora-talent`

---

## 1. Entradas y procedencia

| Archivo | SHA-256 | Rol |
| :--- | :--- | :--- |
| `953f91ad-Exito-sin-compania-editable.docx` | `f8282b9b96c7fec26a507d2535cb4e3c2cc94f64237def396af22db04f7dc90e` | DOCX problemático (regresión) |
| `5818a8b4-Exito-sin-compania-editable.odt` | `e4034de1909f12032f1cda9f0edff8b851868f717fd2d45b5f2f7e36f1aa92fe` | ODT problemático (regresión) |
| `bbb8d5a5-Exito-sin-compania-INTERIOR-tapa-blanda-6x9_v2.pdf` | `38574a456fd744eabb1f61accb95476d38cdbc93071bda440521f6d5b5f2f9b9` | PDF de referencia (45 páginas, 6×9", texto seleccionable) |

Los tres originales se conservaron intactos; no se incluyeron en el repositorio git (manuscrito con derechos de autor del usuario — ver §7 sobre fixtures).

---

## 2. Fase 1 — Causas raíz confirmadas en Anclora Talent

Diagnóstico reproducido empíricamente ejecutando el pipeline real (`extractImportedDocumentSeed`) contra los dos archivos problemáticos, no solo revisión estática de código.

### 2.1 DOCX — colapso total de estructura (1 capítulo en vez de 10+4+2)

- **Etapa exacta de pérdida**: `extractDocxRichContent` (mammoth), `src/lib/projects/import-pipeline.ts`. El `styleMap` solo promueve a `<h1>-<h6>` los estilos Word con nombre; el 100 % de los párrafos del documento están en `Normal`. Resultado: cero etiquetas de encabezado en todo el HTML extraído.
- Los marcadores ("CAPÍTULO UNO"…"CAPÍTULO DIEZ") comparten párrafo con su título mediante `<w:br/>`, y `CHAPTER_MARKER_RE`/`inferSectionSemantics` solo aceptaban dígitos arábigos — ni siquiera habrían disparado sobre texto en mayúsculas sin estilo.
- El resultado real antes de corregir: `chapterCount: 1`, título tomado del nombre de archivo, `detectedOutline: []`.

### 2.2 ODT — estructura recuperada pero índice fusionado y jerarquía plana

- La reconstrucción geométrica (`odt-layout-flow.ts`) ya existía y funcionaba: recuperaba los 10 capítulos correctamente como encabezados reales.
- Defecto 1: la heurística de fusión de párrafos (`sameStyle`/`closeEnough`) fusionaba las 16 entradas del índice en un único párrafo corrido con los separadores de puntos incrustados.
- Defecto 2: partes y capítulos quedaban al mismo nivel estructural (sin jerarquía padre-hijo), y `chapterNumber`/`semanticType` quedaban `null`/`'other'` para los 10 capítulos reales por el mismo motivo del punto 2.1 (solo dígitos arábigos).

### 2.3 Hallazgos adicionales confirmados

- Tamaño de fuente del flujo geométrico ODT (`fontSizePt`) calculado pero nunca copiado al `run` emitido — formato perdido silenciosamente.
- `injectDocxSourcePageBreaks` solo detectaba `<w:br type="page">`/`lastRenderedPageBreak`; los 45 saltos de página de este documento estaban codificados como `<w:sectPr>` (saltos de sección), 0 detectados.
- La fusión de kicker+título ya existente en el código convertía "PARTE II" en "Parte Ii" (numerales romanos tratados como palabra normal).
- `analyzeDocxLocally`/`.slice(0, 4)`: confirmado cosmético en la ruta real (`chapterCount` se calcula sobre la lista completa antes de truncar la vista previa); no contribuye a la pérdida estructural de este corpus.

### 2.4 Correcciones aplicadas (commit `19452d7`)

- Reconocimiento de numeración arábiga, romana y escrita (ES/EN) — `parseMarkerNumberToken`, `romanToNumber`.
- `promoteDocxChapterMarkerParagraphs`: promueve a encabezado real los párrafos "Normal" con marcador+título (capítulo, parte e introducción/conclusión/prólogo/epílogo/apéndice/glosario/bibliografía), en las dos formas físicas observadas (mismo párrafo con `<br/>`, o dos párrafos consecutivos).
- `splitConcatenatedTocParagraph`: divide un índice concentrado en un único párrafo en entradas `data-toc-entry` independientes, para DOCX y ODT.
- `injectDocxSourcePageBreaks`: detecta también saltos de sección `<w:sectPr>` (ignorando los declarados `continuous`).
- Corrección de la conversión mayúsculas→Título que mutilaba numerales romanos.
- Nuevo tipo semántico `'part'` en `SectionSemanticType`; `ChapterOrganizer.tsx`/`ChapterEditorFullscreen.tsx` actualizados para no etiquetar una parte como "CAPÍTULO N".

### 2.5 Segunda corrección (commit `adb187f`) — descubierta durante la Fase 3

Al importar en Talent los documentos **ya corregidos y generados por la skill** (con estilos de encabezado reales de dos niveles — Heading 1 para partes, Heading 2 para capítulos — y marcador "Editorial Kicker" como párrafo propio), se detectó un segundo defecto no visible con los archivos originales rotos: `determineChapterBoundaryLevel` elige un único nivel de corte y, al existir dos niveles reales (parte y capítulo), los 10 capítulos quedaban absorbidos como contenido plano de su parte contenedora (`chapterCount` caía de 18 a 6, con las 10 entradas de capítulo desaparecidas del todo).

**Corrección**: un párrafo "Editorial Kicker" inmediatamente anterior a un encabezado se trata siempre como límite estructural, independientemente del nivel heurístico — es la función misma de ese estilo. Verificado: ambos formatos regenerados por la skill recuperan ahora la estructura completa de 18 entradas.

### 2.6 Gate de Fase 1 — resultado

Verificado con los **dos archivos reales originales** (no solo fixtures sintéticos):

| | DOCX original | ODT original |
| :--- | :--- | :--- |
| Capítulos numerados | 10/10, en orden, numerados 1–10 | 10/10, en orden, numerados 1–10 |
| Partes | 4/4, numeradas I–IV, con `semanticType: 'part'` | 4/4, numeradas I–IV |
| Introducción / Conclusión | Detectadas y etiquetadas | Detectadas y etiquetadas |
| Índice | Entradas separadas (3+ reconstruidas por párrafo afectado) | 16 entradas separadas |
| Capítulos fantasma / duplicados | Ninguno observado | Ninguno observado |

101 tests preexistentes de importación/ODT/DOCX pasan sin modificar; 40 tests nuevos de regresión añadidos (`import-pipeline.docx-bare-markers.test.ts`, extensión de `source-pagination.test.ts`).

---

## 3. Fase 2 — Skill `convertir-pdf-editable`

### 3.1 Fuente canónica — limitación importante

La skill **no tiene repositorio git**. Es una carpeta de cuenta (`claude.ai`) creada originalmente con ChatGPT y sincronizada localmente en este contenedor en:
`/root/.claude/skills/synced/a28b0591-0a96-4442-b1e5-05b41ebcd66e_88e0866b-2911-4cfb-92cd-0975fde95fd8/convertir-pdf-editable/`

**Los cambios hechos en esa carpeta en esta sesión NO se guardan en la cuenta del usuario** y una futura sincronización puede sobrescribirlos o eliminarlos. Los archivos actualizados se entregan como descarga (ver §8) para que el usuario los suba manualmente a su carpeta de la skill y, si procede, a su cuenta de origen.

### 3.2 Cambios

- `SKILL.md` / `references/reconstruccion.md`: nueva sección de reconstrucción semántica genérica (jerarquía por tamaño relativo al cuerpo, marcadores con tracking de letras, numeración ES/EN/romana/escrita, distinción tabla real vs. recuadro de cita, folios como numeración automática), comprobaciones semánticas obligatorias añadidas a la verificación.
- `scripts/numbering.py`: parser de numeración arábiga/romana/escrita (ES/EN).
- `scripts/pdf_to_docx.py` (1081 líneas): reconstrucción genérica PDF→DOCX — sin títulos de este libro hardcodeados en la lógica (verificado por inspección de código: solo aparece una mención del libro, en un comentario que documenta dónde se encontró un bug durante las pruebas, no como regla de detección).
- `scripts/convert_formats.py`: DOCX→DOC/ODT vía LibreOffice headless, perfil aislado por conversión.
- `scripts/verify_conversion.py` (434 líneas): render a PDF de cada formato final, comparación página a página (recuento, diferencia de píxeles, texto normalizado), inspección de editabilidad real.

---

## 4. Fase 3 — Matriz de pruebas

| Entrada | Acción | Resultado |
| :--- | :--- | :--- |
| DOCX problemático original | Importar con Talent corregido | **PASS** — 10 capítulos + 4 partes + intro + conclusión + índice, sin alterar la entrada |
| ODT problemático original | Importar con Talent corregido | **PASS** — igual, sin duplicados |
| PDF original | Skill actualizada → DOCX | **PASS** — ver §4.1 |
| PDF original | Skill actualizada → ODT | **PASS** — ver §4.1 |
| PDF original | Skill actualizada → DOC | **PASS** — ver §4.1 |
| Cada salida nueva | Importar con Talent corregido | **PASS** — ver §4.2 (capítulos/formato/estructura); **BLOCKED** edición en vivo en la UI — ver §4.3 |

### 4.1 Generación de los tres formatos — detección estructural y fidelidad visual

Detección de marcadores (algoritmo genérico: colapso de tracking de letras, tamaño relativo al cuerpo, diccionario de palabras clave ES/EN, numeración arábiga/romana/escrita — **sin títulos de este libro hardcodeados**) contrastada contra las 30 líneas de marcador reales del PDF:

- **30/30** líneas de marcador enrutadas correctamente (estructural vs. editorial/índice).
- **16/16** marcadores estructurales (4 partes + 10 capítulos + introducción + conclusión) con tipo, número y nivel correctos.
- Índice (página 4): 16 entradas recuperadas con su número de página.
- 13/13 kickers no estructurales (REFLEXIÓN, EJERCICIO, PARA TERMINAR, TU PRIMER MOVIMIENTO) correctamente dejados fuera de la lista de capítulos.
- 1 límite conocido documentado explícitamente (no oculto): el kicker "TU PRIMER MOVIMIENTO" no coincide con el vocabulario genérico de palabras clave estructurales (capítulo/parte/introducción/…) por lo que no se etiqueta como límite estructural — su encabezado (20pt) sigue detectándose y estilizándose correctamente; no se pierde contenido ni estructura, solo la etiqueta semántica "es un capítulo/parte" para ese bloque concreto, que tampoco lo es en el oráculo (el PDF no usa ahí ningún marcador editorial genérico, es específico de este libro).

Tablas: 12 detecciones de "tabla" por `pdfplumber`; verificadas una a una — solo las páginas 14 y 38 son tablas reales multi-fila/columna (convertidas a tablas nativas DOCX/ODT); las 10 restantes son recuadros de una sola columna ("REFLEXIÓN"/"EJERCICIO"), reconstruidos como párrafo con estilo de cita y su kicker como "Editorial Kicker" precedente — no como tabla ni como imagen.

Imágenes: 2 imágenes reales (emblema circular, páginas 1–2, ~83×83pt, no a página completa) conservadas como imágenes incrustadas reales.

Páginas origen/resultado: **45/45 en los tres formatos** (DOCX, DOC, ODT), verificado renderizando cada formato final de vuelta a PDF y comparando el recuento de páginas, no solo confiando en que el archivo se abra.

Comparación visual: diferencia media de píxeles por página (0–255, DPI 150) entre 3.0 y 21.4, con media ≈14.8 en los tres formatos — señal gruesa, explicada en su totalidad por el antialiasing/sustitución tipográfica del render y por el colapso intencional de tracking de letras en los kickers (p. ej. "C A P Í T U L O U N O" → "CAPÍTULO UNO"): las 30 páginas con diferencia de texto "genuina" son exactamente las 30 páginas con kicker, y en cada una el único cambio de palabras es la forma colapsada del propio marcador — no hay pérdida ni alteración de contenido. Inspección visual directa de las páginas con mayor diferencia (tabla de la página 38, portada de capítulo de la página 20): maquetación, colores, tabla y orden de lectura prácticamente idénticos; se observa una pérdida menor y explicitada de la decoración de cita en bloque (barra lateral de color) en el reflejo DOCX, que queda como cursiva simple sin ese elemento gráfico — fidelidad de contenido intacta, fidelidad decorativa parcial.

Editabilidad confirmada (no solo renderizado): DOCX 328 párrafos (280 con contenido), 60 encabezados con estilo real, 2 tablas nativas, ~39 900 caracteres extraíbles; DOC/ODT 361 párrafos, mismas 60 cabeceras, 2 tablas, ~39 760 caracteres — texto real seleccionable, ninguna página rasterizada.

### 4.2 Reimportación de las conversiones nuevas en Talent

Los tres formatos generados por la skill se reimportaron con el Talent ya corregido (commits `19452d7` + `adb187f`), usando el mismo pipeline real (`extractImportedDocumentSeed`):

- **DOCX, ODT y DOC regenerados: los tres recuperan 18/18 entradas** — índice, introducción, 4 partes (numeradas I–IV, `semanticType: 'part'`), 10 capítulos (numerados 1–10, `semanticType: 'chapter'`), conclusión, cierre editorial — en el orden correcto, sin fantasmas ni duplicados. El `.doc` se verificó con el mismo mecanismo (`extractImportedDocumentSeed`): Talent normaliza `.doc` a `.docx` vía LibreOffice (`normalizeDocToDocx`) y reutiliza la misma ruta rica de `extractDocxRichContent`, por lo que hereda directamente las correcciones de la Fase 1.

### 4.3 Edición real en la interfaz de Talent — **BLOCKED**

El contenedor de esta sesión no tiene un demonio Docker accesible (`docker.sock` ausente) y no existe `.env.local`; `PRODUCTION_RUNTIME.md` exige Postgres local vía Docker para desarrollo/E2E (no producción). No fue posible levantar la aplicación Next.js con base de datos para ejecutar el recorrido real "editar párrafo y título → guardar → recargar → comprobar persistencia y preview" ni el test E2E existente `e2e/pdf-import-structural-recovery.spec.ts`, que cubre justamente este flujo.

**No se declara PASS en este punto.** Queda pendiente y requiere un entorno con Docker disponible (o acceso a una base de datos de desarrollo ya levantada) para completarse.

---

## 5. Conteo de capítulos/partes — entradas originales vs. nuevas conversiones

| Fuente | Capítulos | Partes | Intro/Concl. | Índice |
| :--- | :--- | :--- | :--- | :--- |
| DOCX original (roto) | 10/10 ✓ | 4/4 ✓ | ✓/✓ | entradas separadas |
| ODT original (roto) | 10/10 ✓ | 4/4 ✓ | ✓/✓ | 16 entradas separadas |
| DOCX generado por la skill | 10/10 ✓ | 4/4 ✓ | ✓/✓ | 16 entradas separadas |
| ODT generado por la skill | 10/10 ✓ | 4/4 ✓ | ✓/✓ | 16 entradas separadas |

Títulos de los 10 capítulos (coinciden con el oráculo del enunciado, verificado, no asumido): La paradoja del éxito solitario · Cómo se construye una vida llena y vacía a la vez · Las cuatro corazas del alto rendimiento · Soledad que duele, soledad que elegiste · Vulnerabilidad estratégica: el coraje que nadie te enseñó · Reaprender a vincularte: el músculo atrofiado · Diseña tu círculo: calidad por encima de cantidad · Intimidad sin renunciar a tu independencia · Relaciones como sistema, no como acontecimiento · Redefinir el éxito: la métrica que faltaba.

---

## 6. Dependencias, fuentes y limitaciones residuales concretas

- **Motores usados**: LibreOffice 24.2.7.2 (headless, perfil aislado por conversión), PyMuPDF 1.28.2, pdfplumber, python-docx. Ninguno enviado a terceros externos.
- **Fuentes**: el PDF usa Carlito (cuerpo) y DejaVuSerif (títulos), ambas de libre distribución y presentes en el entorno de LibreOffice usado para la conversión — no se detectó necesidad de sustitución tipográfica en esta ejecución.
- **Limitación residual 1**: el kicker "TU PRIMER MOVIMIENTO" (página 45, cierre editorial) no se clasifica como límite estructural por no pertenecer al vocabulario genérico de palabras clave — documentado en §4.1, sin pérdida de contenido.
- **Limitación residual 2**: la decoración de cita en bloque (barra lateral de color) de los pull-quotes no se conserva al pasar por DOCX; el texto y su cursiva sí.
- **Limitación residual 3**: paginación 45→45 verificada por recuento y render, no se declara idéntica a nivel de ajuste de línea exacto dentro de cada página — el propio diseño de la skill advierte explícitamente contra esa promesa.
- **Limitación residual 4 — BLOQUEANTE para el criterio de aceptación "edición real en Talent"**: sin Docker/entorno de aplicación disponible en este contenedor, no se ejecutó el recorrido UI de edición/guardado/recarga. Ver §4.3.
- **Título de portada con tracking de letras**: en el DOCX/ODT original importado, el campo `title` del documento ("G u Í a P R Á C T I C a · D e S a R R o L L o P e R S o N a L") conserva el espaciado de letras sin colapsar en la ruta de detección de título (distinta de la ruta de detección de capítulos, que sí colapsa el tracking) — no bloquea el gate de capítulos exigido, pero es una imperfección cosmética real, no corregida en esta intervención por estar fuera del árbol de causas que bloqueaban la estructura.

---

## 7. Fixtures y reproducibilidad

No se han incluido los manuscritos reales en git (contenido con derechos de autor del usuario). El repositorio ya contenía, antes de esta intervención, fixtures de prueba derivadas del mismo libro en `odt-layout-flow.test.ts` (excertos cortos: títulos, nombre de autor, marcadores) — se ha seguido ese mismo criterio para los tests nuevos, usando fragmentos cortos construidos a mano con la misma forma exacta de los archivos reales, no los archivos completos.

Para reproducir localmente con los archivos reales:
```bash
# Fase 1 — importación en Talent
npx tsx <script que llama a extractImportedDocumentSeed(file)> \
  con el DOCX/ODT real como entrada

# Fase 2/3 — skill
python3 scripts/pdf_to_docx.py <pdf> salida.docx
python3 scripts/convert_formats.py salida.docx <dir>
python3 scripts/verify_conversion.py <pdf> salida.docx salida.doc salida.odt <dir informe>
```

---

## 8. Rutas de entrega

- **Talent**: commits `19452d7`, `adb187f` en `origin/development` (push realizado, autorizado explícitamente por el usuario).
- **Skill actualizada** (no guardada en la cuenta del usuario, entregada como descarga): `SKILL.md`, `references/reconstruccion.md`, `scripts/*.py`.
- **Conversiones finales** (SHA-256 arriba): `exito-sin-compania.docx`, `.doc`, `.odt`.
- **Evidencia de verificación**: informes JSON/Markdown por formato y capturas de las 5 páginas con mayor discrepancia por formato, comparación de marcadores frente al oráculo.

---

## 9. Confirmación de estado

- Rama: `development`, sincronizada con `origin/development` tras el push autorizado.
- Working tree: limpio tras cada commit (verificado con `git status --short`).
- Sin promoción a `staging`/`production`/`main`, sin despliegue, sin modificación de datos de producción.
