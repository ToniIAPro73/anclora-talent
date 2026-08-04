# Fase 3 — IA gobernada sobre el motor (plan de mejora v2 + adenda dual perfiles)

Cerrada: 2026-08-04. Rama `development`.

## Entregables

1. **Núcleo IA** — `src/lib/ai/provider.ts` (OpenAIProvider fetch nativo con `OPENAI_API_KEY`/`OPENAI_MODEL`; NullProvider sin key → integración oculta, nada se rompe). `AiProposal` con `operations` (update/remove/insert/move con before/after) + diff en formato `src/lib/document/diff.ts`; aplicar/invertir; `StaleProposalError` (aceptar re-lee y rechaza propuestas obsoletas sin escribir). Aplicación SIEMPRE por la ruta de guardado existente (R3, 0 escritura directa).
2. **Capa 1 — asistente estructural** — fixes de violations/preflight como diff aceptable/rechazable: heading jump → nivel correcto (heurístico), viudas con párrafos cortos → merge (heurístico), keepTogether oversized → advisory (R6). **Agente de coherencia**: refs rotas → texto plano, headings duplicados → renombre (LLM o sufijo), capítulo sin H1 → advisory. Pasada LLM schema-validada (zod) con fallback heurístico; modo cloud siempre declarado.
3. **Capa 2 — co-autor con gates** — `co-author.ts`: reescritura de estilo (few-shot de voz del BrandProfile activo), arquitectura de contenido (moves/inserts), resumen/lead magnet derivado del AST. Todo como `AiProposal`; LLM obligatorio → sin provider no disponible (declarado, sin heurística falsa). UI en workspace con `AiProposalCard` (aceptar/rechazar).
4. **Gobernanza** — procedencia humano/IA por bloque (jsonb en `project_documents`, derivada del diff estructural en cada guardado); registro de operaciones IA aceptadas (auditoría); **disclosure KDP** generado desde procedencia (ES/EN, AI-assisted vs exento); copy ético "asistente editorial — tú decides" + declaración de modo nube en cada operación.
5. **Adenda — StructureProfile (scaffolding gobernado)** — extractor puro `src/lib/structure-profile/` con contrato EXACTO sobre el fixture: 4 H1 / 12 H2 / 41 H3 = 57, 14 tablas, 3 imágenes, promedio 3,42 rango [0,4] distribución [2,4,4,4,3,4,4,4,4,4,4,0], enumeration "Coraza N · …", confianzas por campo (`verificado_en_fuente` / `inferido_de_un_documento`, nunca obligatorio). Perfiles versionados `structure_profiles` (G4, fuente registrada). Flujo UI: toggle → extractor → confirmación obligatoria (G2, también para perfiles guardados) → andamiaje con titulares genéricos, **test de no-transferencia de voz** (ningún 6-grama del fixture en el andamiaje).

## Commits

- `7e1834a`/`315a761`/`819ae3f` extractor + versionado + flujo scaffolding
- `0364628` núcleo IA · `27e80a3` asistente + coherencia · `0ea6b56` UI propuestas
- `4df85db` co-autor · `689a2e8` gobernanza · `4f44bdc` UI co-autor

## Desviaciones (gana el código)

- zod ya era dependencia: validación LLM sin dep nueva; provider fetch nativo.
- Procedencia como jsonb (más simple que tabla); marca `human` en edición HTML de capítulos queda fuera (ids no ancla AST).
- Extractor cuenta imágenes del `sourceHtml` de mammoth (el AST las descarta) con fallback a bloques image.
- H2s del capítulo Índice sintético excluidos del conteo estructural (regla honesta, no fitting).
- Rechazo de propuestas sin registro (opcional en spec).

## Criterio de salida

Pipeline "refactoriza capítulo para reducir ~2 páginas manteniendo ideas" con provider falso inyectado: propuesta → diff → aceptar → documento cambia por ruta existente → procedencia `ai` → disclosure refleja la operación; rechazar → intacto. Verificado en `co-author-pipeline.test.ts`. Extractor sobre fixture reproduce métricas del JSON v2: verificado (contrato duro).
