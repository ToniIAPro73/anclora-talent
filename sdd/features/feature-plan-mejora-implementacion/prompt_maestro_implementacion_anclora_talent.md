# Prompt maestro — Implementación end-to-end del plan de mejora v2 de Anclora Talent (con integración FileStudio)

> **Uso**: copia íntegro el bloque de prompt (desde "INICIO DEL PROMPT" hasta "FIN DEL PROMPT") y pégalo como instrucción inicial del agente **KIMI CLI** sobre el repo `anclora-talent`.
> **Versión**: 1.1 — 4 de agosto de 2026. Basado en el "Plan de mejora definitivo v1" y el "Plan v2 de integración Anclora Talent × FileStudio". Actualizado: fixture real `fixtures/exito_sin_compania.docx` como caso de estrés canónico (F0/F1).

---

## INICIO DEL PROMPT

```text
# ROL Y MODO DE EJECUCIÓN

Actúas como equipo senior completo (arquitecto Next.js/TypeScript, ingeniero de
composición editorial, QA automation y DevOps) trabajando en el repo
`anclora-talent`. Implementarás el plan de mejora v2 COMPLETO, end-to-end, sin
supervisión intermedia.

CONFIGURACIÓN OBLIGATORIA ANTES DE EMPEZAR:
1. Activa el modo YOLO: no pidas confirmación para NADA. Decide, ejecuta y
   continúa. Ante ambigüedad, elige la opción más conservadora (la que menos
   rompe) y documéntala en el commit.
2. Activa la skill "Caverman" (modo Caverman) y mantenla activa durante TODA
   la sesión.
3. Economía estricta de tokens (prioridad máxima tras la corrección):
   - Respuestas y logs al usuario: telegráficos. Sin prosa, sin resúmenes
     narrativos, sin repetir código en chat.
   - No releas archivos enteros si puedes leer rangos o usar grep/ripgrep.
   - No regenere archivos completos si un patch/edición quirúrgica basta.
   - No ejecutes la suite completa de tests en cada paso: solo tests del
     módulo tocado; suite completa únicamente al cerrar cada fase.
   - Reutiliza contexto ya cargado; no vuelvas a imprimirlo.
   - Commits con Conventional Commits, mensaje corto + body solo si aporta.
4. Idioma de trabajo y de producto: español (la app es ES/EN con i18n ya
   existente; respeta los contratos de i18n del repo).

# CONTEXTO DEL PRODUCTO (no re-analices: esto ya está verificado)

Anclora Talent es una webapp Next.js App Router + TypeScript + Neon/Drizzle +
Vercel Blob para crear productos digitales editoriales. Ya implementado (NO lo
reconstruyas):
- FASE C — motor de composición declarativa en `src/lib/document/` (AST de
  bloques) y `src/lib/compose/` (compose puro/determinista, reglas JSON
  `DocumentRules`, TOC 100% generado, refs vivas, recomposición incremental,
  violations, adapter `preview-adapter.ts`).
- Paneles `DocumentHealthPanel`, `DocumentRulesPanel`, export gate
  (off/warn/block, default warn), inyección de metadatos, footer.
- Importación premium DOCX/MD, reimportación con diff (`reimport.ts`,
  `ReimportDialog`), Cover Studio con sync de metadatos (commit D.3),
  export PDF/DOCX/HTML, auth propia + OAuth, i18n ES/EN, ~483 tests Vitest +
  Playwright e2e verdes.
- Flujo de ramas: development → staging → production → main.

El plan v2 tiene 5 fases (F0-F4) + integración con el repo hermano
`anclora-filestudio` (API de conversión multi-formato local-first, ya
construida, con campos `requestingOrg`/`requestingApp` en
`apps/api/src/routes/agent.ts` y Agente Local con pairing/consent ya
implementados). Referencia completa: documentos del plan en la raíz del
workspace (`plan_mejora_definitivo_anclora_talent.agent.final.md` y
`plan_mejora_v2_anclora_talent_filestudio.md`) — léelos UNA vez al inicio.

# REGLAS DE TRABAJO (vinculantes)

R1. Trabaja SIEMPRE sobre la rama `development`, en commits atómicos por
    entregable. No promociones a staging/production/main: eso lo hace el dueño.
R2. Todo entregable se considera hecho SOLO si: compila (`tsc` sin nuevos
    errores), lint 0, tests del módulo verdes, y funciona end-to-end desde la
    UI real. Nada de mocks aislados.
R3. No rompas la regla de oro: UN modelo canónico (AST de `src/lib/document/`)
    como fuente única para editor, preview y export. Ninguna representación
    paralela sin capa de mapeo explícita.
R4. El TOC sigue siendo 100% generado por el compositor. Jamás editable a mano.
R5. Clientes Neon siempre lazy (nunca en module scope). Autorización validada
    en server actions, no solo en middleware.
R6. Presets y comportamiento premium: autocorrige lo seguro, avisa lo dudoso.
    Nada de "precipicio" de configuración estilo Scrivener.
R7. i18n ES/EN en toda cadena visible. Contratos de marca y UI del repo
    (`docs/standards/`) son ley.
R8. Si una tarea del plan contradice el estado real del código, gana el código:
    documéntalo en `sdd/` y sigue.
R9. Documenta cada fase cerrada en `sdd/` (spec breve) y actualiza
    `sdd/roadmap.md`. Documentación mínima viable, no literatura.

# FASE 0 — Productización del motor (hito: demo "momento nunca-más")

Entregables:
1. Onboarding guiado del workspace que narre el diferencial: presets
   default/print/digital con copy orientado a beneficio ("nunca más un índice
   desactualizado"), no a parámetro técnico.
2. Telemetría ligera de recomposición (tiempo ms por recompose, log cliente +
   contador en health panel) verificando el presupuesto <300 ms sobre el
   documento de prueba REAL `fixtures/exito_sin_compania.docx` (el dueño lo
   colocará en esa ruta; libro real de 46 páginas: 4 partes H1, 12 capítulos
   H2, 42 secciones H3, 14 tablas, 3 imágenes, 42 saltos de página manuales
   y TOC cacheado — es el caso de estrés canónico del producto). El fixture
   sintético anterior ("Nunca más en la sombra") queda solo para tests
   unitarios existentes; no generes documentos sintéticos nuevos.
3. Cierre de deuda: undo de diffs de recomposición en live preview (banner con
   acción revertir); cover-studio leyendo del modelo `DocumentMetadata` donde
   falte.
4. Tests de contrato ampliados para `compose`, `preview-adapter` y reglas.
Criterio de salida: demo grabable sobre `fixtures/exito_sin_compania.docx`
importado: se añade un párrafo en el capítulo "La paradoja del éxito
solitario" y el índice (regenerado con profundidad H1-H3) y la paginación se
actualizan solos en vivo, sin páginas intermedias vacías y con las 14 tablas
intactas (sin cortes feos gracias a keepTogether).

# FASE 1 — EPUB + pre-flight por canal (ticket de entrada; NO dilatar)

Entregables:
1. Writer EPUB 3 PROPIO desde el AST (NO delegar en FileStudio: el EPUB
   primario sale del compositor con TOC generado y reglas). EPUBCheck
   integrado en CI como gate.
2. Pre-flight por canal (KDP, IngramSpark, Kobo) como extensión del
   `DocumentHealthPanel`: validaciones PKG-026, imágenes, metadatos,
   accesibilidad EPUB; severidades y enlace a preview como las violations.
3. PDF print-ready: el compositor genera; el post-proceso (compresión,
   validación de specs) se delega a FileStudio vía API (ver FASE 1b).
Criterio de salida: EPUB válido a la primera en EPUBCheck generado desde el
proyecto real `fixtures/exito_sin_compania.docx` (con NCX de 3 niveles y las
14 tablas convertidas); panel pre-flight con 0 falsos positivos en ese mismo
fixture una vez limpio.

# FASE 1b (PARALELA a Fase 1, no consume capacidad del writer EPUB)
# Integración API FileStudio — Modo Agente Local

Contexto verificado: FileStudio (`anclora-filestudio`) ya tiene API de trabajos
con `requestingOrg`/`requestingApp`, Agente Local (`apps/local-agent/`) con
pairing por clave pública + código 6 dígitos, consentimiento `ask-always`,
tokens de descarga de un solo uso, y precedente de integración documentado en
`docs/integrations/anclora-nexus/`.

Entregables:
1. Contrato de integración en `sdd/integrations/filestudio/` (api-flow,
   autenticación por scope, webhooks, routing-policy Modo 1/2/3), replicando
   el patrón Nexus.
2. Cliente FileStudio en Talent (`src/lib/filestudio/`): emisión de trabajos
   con `requestingApp: "anclora-talent"`, pairing UI, consent UI, recepción
   por webhook, circuit breaker + cola con reintentos.
3. Prototipo end-to-end: optimización de imagen de portada en 3 resoluciones
   vía Agente Local. Después, post-proceso PDF de Fase 1.
4. Indicador de modo de procesamiento (local/service/navegador) visible en
   cada operación — regla de producto innegociable.
5. Endurecimiento: revisión del threat model para consumidor multi-tenant,
   límites por usuario, y propuesta de reclasificación del repo FileStudio
   (documento para el dueño; NO modifiques el repo FileStudio salvo el
   contrato de API versionado si hiciera falta).
EXCLUSIÓN EXPLÍCITA: nada de yt-dlp ni descarga de contenido de terceros en la
integración ni en strings de UI.

# FASE 2 — Producto compuesto y multi-formato

Entregables:
1. Biblioteca de plantillas: libro estándar, manual técnico, guía/lead magnet,
   curso modular, bundle. Cada plantilla = estructura base + `DocumentRules` +
   lista de activos derivados. Evoluciona `TemplateSelector`.
2. Export multi-formato coordinado desde el AST (EPUB, PDF, HTML, Markdown
   blog, slides) con manifiesto de activos versionado; cada activo marcado
   con procedencia (compositor | filestudio-local | filestudio-service).
3. Dentro del manifiesto, FileStudio absorbe: imágenes (3 resoluciones),
   formatos legacy (MOBI/AZW3 vía Calibre), y audio/vídeo ligero para la
   plantilla curso (FFmpeg).
4. OCR de ingesta: manuscrito escaneado/PDF-imagen → FileStudio (Tesseract) →
   pipeline de importación premium existente.
5. Historial de versiones del documento: snapshots del AST con diff navegable.
Criterio de salida: un proyecto genera un "pack de lanzamiento" completo en una
acción, con todos los activos versionados y su procedencia visible.

# FASE 3 — IA gobernada sobre el motor

Entregables:
1. Capa 1 — asistente estructural: agente que propone fixes concretos de las
   violations del health panel (diffs sobre el AST aceptables/rechazables) y
   agente de coherencia de refs/TOC. IA conectada AL MOTOR, no chat genérico.
2. Capa 2 — co-autor con gates humanos: reescritura de estilo, arquitectura de
   contenido, resumen/lead magnet derivado del AST; todo como diff sobre AST.
3. Gobernanza: registro de procedencia humano/IA por bloque; generación del
   disclosure de KDP; copy de marketing ético ("asistente editorial, no
   escritor fantasma"). Las operaciones IA en nube se declaran como tales
   frente a las conversiones locales (transparencia de modo de procesamiento).
Criterio de salida: pipeline "refactoriza el capítulo 3 para reducir 2 páginas
manteniendo ideas" ejecutado con diff aceptable/rechazable.

# FASE 4 — Distribución, colaboración y ecosistema

Entregables (prioriza en este orden; lo que no entre, queda documentado):
1. Integraciones de venta: export/push a Gumroad y Hotmart; paquete de
   lanzamiento (ebook + fichas + copy de landing).
2. Colaboración: comentarios y corrección por roles (autor/corrector/
   maquetador) sobre el AST, sin peaje por asiento para el corrector.
3. API de salida del compositor (solo si hay demanda de la beta) y plugins de
   reglas por nicho.

# ORDEN Y GATES

- Secuencia estricta: F0 → F1 (con F1b en paralelo) → F2 → F3 → F4.
- Al cerrar cada fase: suite completa verde, build ok, spec en `sdd/`, commit
  de cierre `feat(fase-N): ...` y push a `development`.
- NO comuniques el mensaje de "procesamiento local verificable" en UI/landing
  hasta que el prototipo de F1b funcione en producción/staging.

# ADENDA — SISTEMA DUAL DE PERFILES (aprobada por el dueño, 2026-08-04)

Contexto: el producto incorpora dos tipos de perfil independientes y combinables,
aplicables a cualquier documento: **perfil de marca** (identidad visual/verbal)
y **perfil de estructura** (jerarquía, secuencia narrativa, patrones de
composición). Reglas de gobernanza vinculantes (de la spec aprobada):

- G1. Ambos perfiles operan desacoplados: uno, otro, ambos o ninguno.
- G2. Ningún perfil estructural se aplica sin confirmación humana del esquema
  inferido. Jamás aplicación silenciosa.
- G3. El extractor estructural NO captura tono ni léxico (eso es del perfil de
  marca); el de marca NO captura jerarquía documental.
- G4. Perfiles versionados con id único y `status`; todo perfil estructural
  registra su documento fuente (trazabilidad).

## FASE 2 — Entregable nuevo: Perfil de marca como theme pack

1. Modelo `BrandProfile` (Neon/Drizzle, versionado): paleta hex con roles,
   pareja tipográfica + escala, proporciones de uso, reglas de gobernanza de
   marca, y reglas de voz (pares "así suena"/"así no suena" como few-shot).
2. Mapeo BrandProfile → template del compositor (`DocumentRules`/template) con
   `templateOverrides` (mismo patrón que ya usa el writer EPUB): el perfil de
   marca se aplica como overrides, NUNCA como representación paralela (R3).
3. Caso de prueba formal: el Manual de Identidad Anclora Insights v3.0 —
   Negro Tinta #0F172A, Crema Papel #F8FAFC, Oro Metálico #F59E0B, Oro
   Mitigado #D97706 (proporción 55·30·10·5), Libre Baskerville (titulares/
   citas) + Inter (cuerpo/datos), sin terceras familias. El manual está en
   `fixtures/anclora_insights_manual_identidad.pdf`; el extractor debe
   producir un BrandProfile que pase validación determinista (hex, familia,
   escala) contra esos valores.
4. Aplicación por canal: el perfil de marca afecta a PDF/EPUB/HTML por igual
   vía el compositor; verificar que EPUB respeta el override como ya hace
   `tocDepth: 3`.

## FASE 3 — Entregable nuevo: Perfil de estructura como scaffolding gobernado

1. Extractor estructural: heurística de encabezados (depth, heading_map,
   conteos por nivel), macro-patrón (secuencia de partes + función retórica),
   patrón de capítulo (apertura/cierre, subsecciones promedio y rango REALES),
   enumeration_style, table_usage. Cada campo lleva nivel de confianza:
   `verificado_en_fuente` (métricas contables) o `inferido_de_un_documento`
   (patrones retóricos — nunca marcarlos como obligatorios).
2. Esquema JSON de perfil: usar como implementación de referencia
   `structure_profile_exito_sin_compania_v2.json` (validado contra el fixture:
   4 H1 / 12 H2 / 41 H3 = 57 headings, 14 tablas, subsecciones promedio 3,42,
   rango 0–4). El extractor ejecutado sobre `fixtures/exito_sin_compania.docx`
   debe reproducir esas métricas exactas — es su test de contrato.
3. Flujo UI: toggle independiente "Aplicar estructura de referencia" →
   extractor → pantalla de confirmación del esquema inferido (G2) → el agente
   de IA genera el andamiaje (partes/capítulos/subsecciones vacíos o con
   titulares propuestos), NUNCA el contenido de la fuente.
4. Almacenamiento: perfiles versionados por usuario con documento fuente
   registrado (G4), reutilizables entre proyectos.

Criterio de salida (F2): exportar el fixture con el BrandProfile Anclora
Insights activo produce PDF y EPUB que pasan validación determinista de
marca (los 4 hex presentes en sus roles, Baskerville en titulares, Inter en
cuerpo) sin romper EPUBCheck. Criterio de salida (F3): extractor sobre el
fixture reproduce las métricas del JSON de referencia; flujo de confirmación
obligatoria cubierto por test e2e; generación de andamiaje sin arrastrar ni
una frase del texto fuente (test de no-transferencia de voz).

# REPORTE (mínimo de tokens)

Al acabar CADA fase, devuelve SOLO:
- fase, commits (sha + título), tests añadidos/verdes, desviaciones del plan
  y decisión tomada (máx. 5 líneas cada una).
Sin resúmenes narrativos intermedios. Empieza YA por la Fase 0.
```

## FIN DEL PROMPT

---

## Anexo — notas para el usuario (no forman parte del prompt)

1. **YOLO + Caverman**: el prompt ordena activar ambos al inicio. Si tu cliente KIMI CLI requiere flags propios (p. ej. `--yolo`, `/skill caverman`), actívalos también al lanzar la sesión; el prompt refuerza la instrucción por si el agente la pierde en compactaciones de contexto.
2. **Economía de tokens**: las reglas van en la sección de configuración y se reiteran en el formato de reporte (salida telegráfica). Los mayores ahorros reales vendrán de: lectura por rangos vs. archivos completos, tests por módulo vs. suite completa, y commits atómicos que evitan re-trabajo.
3. **Documentos del plan**: el prompt asume que `plan_mejora_definitivo_anclora_talent.agent.final.md` y `plan_mejora_v2_anclora_talent_filestudio.md` están accesibles en el workspace del agente. Súbelos al repo (carpeta `sdd/`) o al workspace antes de lanzar.
4. **Riesgo conocido de YOLO**: sin confirmaciones, el agente puede tomar decisiones de arquitectura discutibles en fases tardías (F3-F4). Mitigación incluida: regla R8 (gana el código), obligación de spec en `sdd/` por fase y commits atómicos revertibles. Revisa los cierres de fase, no los pasos intermedios.
5. **Repo FileStudio**: el prompt prohíbe expresamente modificar `anclora-filestudio` salvo el contrato de API versionado — la reclasificación de "interna" a producto queda como documento de decisión para ti.
