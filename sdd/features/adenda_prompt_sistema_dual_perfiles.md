# Adenda al prompt maestro de Anclora Talent — Sistema Dual de Perfiles (Marca + Estructura)

Instrucciones de uso: pega el bloque entre delimitadores al final del prompt maestro (después de la FASE 4, antes del formato de informe), o entrégalo al agente como continuación cuando retomes el trabajo. Son dos entregables nuevos: uno en la FASE 2 y otro en la FASE 3.

---

=== INICIO DE LA ADENDA ===

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
   citas) + Inter (cuerpo/datos), sin terceras familias. El dueño colocará el
   PDF en `fixtures/anclora_insights_manual_identidad.pdf`; el extractor debe
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

=== FIN DE LA ADENDA ===

---

## Notas para ti (fuera de la adenda)

1. **Coloca también el manual en el repo:** `fixtures/anclora_insights_manual_identidad.pdf` — es el caso de prueba formal del extractor de marca.
2. **Usa el JSON corregido** (`structure_profile_exito_sin_compania_v2.json`, adjunto aquí) en lugar del de Claude: métricas verificadas contra el DOCX real y patrones retóricos degradados de "obligatorio" a "inferido".
3. **Encaje en el roadmap:** el perfil de marca refuerza la Fase 2 (plantillas) y el estructural la Fase 3 (IA gobernada), sin alterar el orden de fases ni el camino crítico.
4. **Diferenciador:** ninguna herramienta del benchmark (Atticus, Vellum, Scrivener) permite "sube tu manual de marca y tu libro de referencia y trabaja así siempre" — esto es marca de la casa desde el primer día.
