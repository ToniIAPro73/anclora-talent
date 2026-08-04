# Plan de mejora v2 — Anclora Talent × Anclora FileStudio: integración del motor de conversión local-first

*Actualización del "Plan de mejora definitivo para Anclora Talent" (v1, 4 de agosto de 2026) tras el análisis del repositorio `anclora-filestudio` y del documento de integración elaborado por Claude. Fecha: 4 de agosto de 2026.*

---

## Resumen ejecutivo

**Veredicto: sí, la integración aporta valor real y diferenciación — pero acotada, en la dirección correcta y con un matiz de honestidad competitiva que el análisis de Claude no hace.** FileStudio no debe tocar el motor de composición de Talent (el AST gobernado es el foso del producto), pero sí absorber todo lo que ocurre *antes* y *después* de ese motor: ingesta defensiva y OCR de manuscritos escaneados, conversión a formatos de cola larga (MOBI/AZW3 legacy), post-proceso de imágenes y PDF con especificaciones de imprenta, y empaquetado de activos derivados. Esa delegación ahorra un esfuerzo estimado de 3-5 persona-mes en las Fases 1 y 2 del plan v1 y añade un quinto pilar de posicionamiento —**procesamiento local verificable**— que ningún competidor cloud del benchmark puede replicar sin rehacer su arquitectura.

Tres hallazgos sustentan esta decisión. Primero, la infraestructura de integración **ya existe**: el esquema de trabajos de FileStudio incluye de fábrica los campos `requestingOrg` y `requestingApp` (hoy consumidos por otra app del ecosistema, Nexus), y el flujo de emparejamiento del Agente Local (clave pública + código de un solo uso, consentimiento `ask-always`) está implementado y testeado, no es conceptual [^FS1^]. Segundo, la garantía de privacidad local-first está documentada como propiedad de arquitectura —la versión Web no sube contenido de archivo a ningún backend, el Agente Local no abre puertos entrantes— y es auditable en código, no una promesa de marketing [^FS2^]. Tercero, el plan v1 presuponía construir desde cero writers y post-proceso que FileStudio ya resuelve con motores probados (Calibre, Sharp, QPDF/pdf-lib, Tesseract, LibreOffice/Pandoc) [^FS3^].

El análisis de Claude es sólido en su tesis central y lo adoptamos como base, pero este plan v2 le introduce tres correcciones: (1) su claim de privacidad es **falso frente a los competidores de escritorio** (Scrivener y Vellum procesan localmente por naturaleza) y debe reformularse como diferencial frente al SaaS cloud, que es donde Talent compite; (2) **omite los motores de audio/vídeo de FileStudio** (FFmpeg, e incluso descarga con yt-dlp), que abren capacidades para la Fase 2 de "curso modular" que el propio plan v1 contempla — con una advertencia de gobernanza sobre yt-dlp; y (3) subestima el coste de gobernanza de reclasificar FileStudio de "repositorio interno" a infraestructura de producto expuesta a usuarios finales.

Las tres acciones de los próximos 30 días del plan v1 se mantienen y se añade una cuarta: **prototipar el flujo Agente Local emparejado con un caso acotado** (optimización de imagen de portada en tres resoluciones desde Talent), porque es la prueba de menor esfuerzo y mayor señal, y condiciona la publicación del nuevo mensaje de privacidad a que la garantía exista en producción.

---

## 1. Qué es Anclora FileStudio hoy: estado real verificado

FileStudio es el motor centralizado de conversión multi-formato del ecosistema Anclora, clasificado en su README como repositorio de **categoría "Interna"** con advertencia explícita contra publicar detalles operativos fuera de canales autorizados [^FS3^]. La auditoría del repositorio (commit base `8a5edab`, contrastado con el estado vivo en GitHub a 3 de agosto de 2026) confirma:

### 1.1 Capacidades de conversión

- **Documentos**: vía LibreOffice/Pandoc (DOCX, ODT, RTF y cola larga).
- **Ebooks**: vía Calibre (incluye formatos legacy como MOBI/AZW3).
- **Imágenes**: Sharp 0.35 (JPEG, PNG, WebP, AVIF; redimensionado, compresión, strip de metadatos EXIF/GPS).
- **PDF**: QPDF/pdf-lib 1.17 (post-proceso, compresión, validación).
- **Audio/vídeo**: FFmpeg (MP3, WAV, FLAC, M4A, OGG, MP4, WebM) — y descarga con yt-dlp, heredada del origen del repo como conversor de YouTube, con clasificación de errores dedicada en commits recientes [^FS4^].
- **OCR**: Tesseract, utilizable para manuscritos escaneados.
- **Datos estructurados**: JSON, YAML, TOML, XML, CSV, TSV.

### 1.2 Arquitectura de despliegue triple y API multi-app

| Componente | Ubicación | Estado | Relevancia para Talent |
|---|---|---|---|
| API de servicio (cola asíncrona, auth por scope, webhooks) | `apps/api/src/routes/` (`agent.ts`, `jobs.ts`, `uploads.ts`) | Implementada con tests (`agent.test.ts`, `auth.test.ts`, `webhook.test.ts`) | Punto de entrada que Talent puede consumir sin exponer el motor local |
| Agente Local (pairing, consentimiento, tokens rotativos) | `apps/local-agent/src/` | Implementado con suite de tests propia | Mecanismo que garantiza que el archivo nunca sale del equipo del usuario |
| Esquema multi-app (`requestingOrg`, `requestingApp`) | `AgentJobRecord` en `apps/api/src/routes/agent.ts` | **Ya existe sin consumidor directo de Talent** (el ejemplo en código usa valores "Nexus"/"Contract") | FileStudio está diseñado de fábrica para recibir trabajos de otras apps del ecosistema |
| Precedente de integración documentado | `docs/integrations/anclora-nexus/` (api-flow, autenticación, webhooks, routing-policy, ejemplo TS) | Existe como contrato de integración con otra app del ecosistema | Plantilla de integración ya resuelta que Talent puede replicar |
| Web local-first (procesamiento en navegador) | `apps/web` + `docs/privacy.md` | `File -> browser memory -> Blob -> descarga local`, sin subida de contenido a `/api/*` | Componente embebible para operaciones ligeras (recorte de portada) |

El repo está activo y saneado: en julio-agosto de 2026 se han aplicado parches de seguridad de dependencias (22 vulnerabilidades resueltas en next/sharp/hono), alineación de marca con el contrato maestro del grupo y releases portables de Windows (v0.2.6) [^FS4^]. Es decir, la superficie de integración está en mantenimiento activo, no abandonada.

## 2. Evaluación del análisis de Claude: qué adoptamos, qué corregimos

El documento de Claude es un buen análisis técnico-estratégico: verificamos sus afirmaciones críticas contra el repositorio y son ciertas (campos `requestingApp`, política `ask-always`, privacidad documentada, motores implementados). Adoptamos su tesis central —**"FileStudio absorbe todo lo que ocurre antes y después del compositor"**— y su modelo de tres modos de despliegue. Pero tres puntos requieren corrección antes de convertirlo en plan:

### 2.1 El claim de privacidad es diferencial frente al SaaS cloud, no frente a todo el mercado

Claude afirma que "ningún competidor del benchmark ofrece garantía de procesamiento local". Eso es **impreciso**: Scrivener y Vellum son aplicaciones de escritorio que procesan los archivos en el equipo del usuario por naturaleza — de hecho, parte de su atractivo es precisamente ese. El claim correcto, y aun así muy potente, es:

> Entre los competidores **cloud** a los que Talent se enfrenta directamente (Atticus, Designrr, los generadores IA-nativos, las plataformas all-in-one), **ninguno ofrece procesamiento local verificable**: el manuscrito sube a servidores ajenos sin capa de red auditable. Talent, emparejado con el Agente Local de FileStudio, puede ofrecer la garantía híbrida: SaaS con colaboración e IA en la nube, pero conversión de activos sensibles en el equipo del usuario, con consentimiento explícito por operación y transparencia sobre dónde se procesó cada archivo.

Esta reformulación importa por dos razones: es defendible en marketing sin riesgo de que un revisor la desmienta con Scrivener, y define exactamente el segmento donde el mensaje muerde — infoproductores con contenido propietario inédito que hoy eligen entre la comodidad del cloud y la soberanía del escritorio, y con Talent no tendrían que elegir.

### 2.2 Claude omite los motores de audio/vídeo: capacidad directa para la Fase 2

El análisis se centra en documentos, imágenes, PDF y OCR, pero FileStudio incluye motores FFmpeg de audio/vídeo (MP3, WAV, FLAC, MP4, WebM) operativos y mantenidos [^FS3^][^FS4^]. El plan v1 define en su Fase 2 la plantilla de **"curso modular"** y los "paquetes de publicación" con activos derivados. La conversión/compresión de píldoras de vídeo y audio para cursos es exactamente el tipo de post-proceso de cola larga que Talent no debería construir. Lo incorporamos al alcance de integración de Fase 2 con prioridad secundaria.

**Advertencia de gobernanza**: FileStudio hereda funcionalidad de descarga con yt-dlp de su origen como conversor de YouTube. Esa capacidad **no debe formar parte de la integración ni de la comunicación de Talent**: exponer descarga de contenido de terceros dentro de un producto comercial de autoría introduce riesgo legal y de marca sin contraprestación para el usuario objetivo. Recomendamos explicitar la exclusión en el contrato de integración.

### 2.3 El coste de reclasificar FileStudio es mayor que "actualizar un contrato"

Claude identifica correctamente que FileStudio está clasificado como "Interna" y que hay que reclasificarlo antes de exponer su API a usuarios finales [^FS5^]. Pero lo trata como un trámite previo de gobernanza. En realidad es un trabajo de endurecimiento con tres frentes: seguridad (la API pasa de consumidor interno conocido a consumidor multi-tenant; los tests `auth.test.ts` actuales validan el scope interno, no un modelo de amenaza externo — el propio repo contiene `threat-model.md` que habrá que revisar), operación (SLA, monitorización compartida, límites por usuario de Talent, no por app), y producto (qué pasa cuando el Agente Local está apagado: cola, expiración de trabajos, UX de espera). Presupuestamos este endurecimiento como entregable explícito de la integración (0,5-1 persona-mes), no como nota al margen.

## 3. Valor diferencial real de la integración

| Vía de valor | Qué aporta | Diferenciación | Evidencia |
|---|---|---|---|
| **Ahorro de esfuerzo** | 3-5 persona-mes evitados en Fases 1-2 (post-proceso PDF/imagen, OCR, formatos legacy, empaquetado) | Velocidad: la ventana competitiva es de ~12 meses; cada persona-mes liberado acelera EPUB y multi-formato | Estimación de Claude, validada contra la matriz de esfuerzo del plan v1 |
| **Quinto pilar de posicionamiento** | "Tus documentos, procesados donde tú decides": SaaS cloud + procesamiento local verificable | **Alta frente a competidores cloud** (Atticus, Designrr, IA-nativos); ninguno puede ofrecerla sin rehacer su arquitectura | `docs/privacy.md`, `docs/security.md` [^FS2^]; benchmark del plan v1 |
| **Nuevas capacidades sin fase dedicada** | OCR de manuscritos escaneados (segmento nuevo: autores con originales físicos); MOBI/AZW3 para catálogos legacy; audio/vídeo para cursos | Media: capacidades que el plan v1 no presupuestaba y que amplían el "todo en uno" | Motores Tesseract/Calibre/FFmpeg operativos [^FS3^] |
| **Coherencia de ecosistema Anclora** | Talent se convierte en consumidor de la API multi-app que FileStudio ya diseñó; precedente Nexus replicable | Interna: reduce coste futuro de integraciones del ecosistema | `AgentJobRecord` con `requestingOrg/requestingApp` [^FS1^] |

**Qué NO aporta** (para evitar sobreventa interna): FileStudio no tiene modelo semántico de documento — opera sobre archivos ya renderizados. El EPUB primario con TOC generado, reglas declarativas y referencias vivas **sigue siendo responsabilidad exclusiva del compositor de Talent**. Delegarlo sería destruir el diferencial principal. La frontera es nítida: *Talent compone; FileStudio convierte y post-procesa.*

## 4. Plan de mejora actualizado: cambios sobre el plan v1

El plan v1 (Fases 0-4, 18 meses, 52-68 persona-mes) se mantiene en su estructura [^V1^]. Estos son los cambios:

### 4.1 Fase 0 — Productización del motor (meses 1-2): se añade el quinto pilar al mensaje

- El mensaje de posicionamiento pasa de "productos digitales que nunca se rompen" a **"productos digitales que nunca se rompen — y que nunca salen de tu equipo si tú no lo decides"**. Se incorpora al onboarding narrado y a la landing, **condicionado** a que el prototipo de integración (§5) esté operativo: no se comunica una garantía que aún no existe en producción.
- Sin cambios de esfuerzo (4-6 persona-mes).

### 4.2 Fase 1 — EPUB y pre-flight (meses 2-4): delegación acotada + iniciativa paralela

| Entregable v1 | Cambio v2 | Esfuerzo |
|---|---|---|
| Export EPUB 3 válido con EPUBCheck en CI | **Sin cambio: writer propio del compositor. No delegable.** | Igual |
| PDF print-ready con specs de imprenta | El compositor genera el PDF; el post-proceso (compresión, validación de specs) se delega a FileStudio vía API | Bajo-medio → bajo |
| *(nuevo)* Formatos legacy de retailers (MOBI/AZW3) | Delegado al motor Calibre de FileStudio | Se absorbe (no presupuestado en v1) |
| *(nuevo)* **Integración API FileStudio — Modo Agente Local** (incluye endurecimiento de seguridad/gobernanza y actualización del contrato de reclasificación) | Iniciativa paralela a Fase 1, sin consumir capacidad del writer EPUB | +2-3 persona-mes, compensados por los 3-5 evitados |

### 4.3 Fase 2 — Producto compuesto y multi-formato (meses 4-8): FileStudio dentro del manifiesto de activos

- El AST de Talent sigue generando EPUB/PDF/HTML/Markdown/slides con versionado por activo. FileStudio absorbe, dentro del mismo manifiesto versionado: post-proceso de imágenes de portada e interiores (tres resoluciones), formatos de cola larga, y —**nuevo en v2**— conversión/compresión de audio/vídeo para la plantilla "curso modular". Cada activo queda marcado con su **procedencia** (compositor propio vs. FileStudio local vs. FileStudio service) para trazabilidad completa.
- *(nuevo)* **OCR de ingesta**: manuscritos escaneados → Tesseract de FileStudio → pipeline de importación premium existente. Atiende un segmento que v1 no contemplaba (autores con originales físicos o PDFs escaneados) con coste marginal.
- Esfuerzo de la fase: alto → medio-alto (12-16 → 10-14 persona-mes).

### 4.4 Fases 3 y 4: matiz, no cambio

- **Fase 3 (IA gobernada)**: sin cambios funcionales, pero la gobernanza IA hereda el pilar de privacidad: las operaciones IA en la nube deben declararse como tales frente a las conversiones locales, manteniendo la transparencia de "dónde se procesó cada cosa" como propiedad de producto.
- **Fase 4 (ecosistema)**: se aclara la dirección de las dos APIs, que el análisis de Claude distingue bien: la integración con FileStudio es de **entrada** (Talent consume una API ya construida dentro del mismo ecosistema — no requiere esperar demanda externa), mientras que la API de **salida** de Talent (exponer el compositor a terceros) sigue correctamente pospuesta a meses 12-18.

### 4.5 Matriz de priorización: iniciativas nuevas

| Iniciativa | Fase | Impacto | Defendibilidad | Esfuerzo | Veredicto |
|---|---|---|---|---|---|
| Integración API FileStudio (Modo Agente Local) + endurecimiento | 1 (paralela) | Medio | Alta (nadie más en el ecosistema lo tiene) | Bajo-medio | **Hacer**: coste bajo, libera Fase 2 |
| Mensaje "procesamiento local verificable" (reformulado anti-cloud, no anti-desktop) | 0 (transversal) | Alto | Muy alta (exige arquitectura, no copy) | Muy bajo | **Prioridad alta**, condicionado al prototipo |
| OCR de ingesta para manuscritos escaneados | 2 | Medio (segmento nuevo) | Media | Bajo | Incorporar a Fase 2 |
| Post-proceso imágenes/PDF vía Sharp/QPDF | 1-2 | Bajo-medio | Baja (comoditizado) | Muy bajo | Delegar: ahorro puro |
| Audio/vídeo para plantilla curso (FFmpeg) | 2 | Medio | Baja | Bajo | Incorporar con prioridad secundaria |
| ~~Descarga yt-dlp~~ | — | — | — | — | **Excluir explícitamente** de la integración y del marketing |

## 5. Arquitectura de integración y riesgos

### 5.1 Tres modos, en orden de prioridad

1. **Modo 1 — Agente Local emparejado (el que sostiene la propuesta de valor)**: pairing único (clave pública + código de 6 dígitos, TTL 10 min), consentimiento `ask-always` por trabajo, el archivo nunca atraviesa servidores de Anclora [^FS2^].
2. **Modo 2 — Service API (fallback de continuidad)**: procesado en infraestructura Anclora con tokens de descarga de un solo uso (TTL 15 min) y logs sin contenido. Cubre al usuario que prioriza comodidad.
3. **Modo 3 — Navegador (operaciones ligeras)**: componente embebido para recorte/compresión puntual de imágenes, sin backend ni emparejamiento.

Regla de producto innegociable: **cada operación declara al usuario en qué modo se procesó**. La opacidad anularía la ventaja competitiva y la coherencia de marca del ecosistema.

### 5.2 Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Sobreventa de privacidad si la mayoría usa Modo 2 (Service) | Media | Alto (credibilidad) | Indicador de modo por operación; métrica de adopción del Agente Local como KPI de Fase 2 |
| Dependencia cruzada de roadmaps (API de FileStudio como punto de fallo compartido) | Media | Medio | Contrato de API versionado; circuit breaker con cola y reintentos; Talent siempre puede generar sus activos primarios sin FileStudio |
| Reclasificación Interna → producto sin endurecimiento suficiente | Media | Alto (seguridad) | Entregable explícito de 0,5-1 p-m: threat model externo, límites multi-tenant, revisión del contrato de gobernanza |
| La integración consume capacidad del writer EPUB | Baja | Alto (retrasaría el ticket de entrada) | Ejecución en paralelo con ventana/equipo distinto; criterio go/no-go de Fase 1 intacto |
| Contaminación de marca/legal por yt-dlp | Baja | Alto | Exclusión explícita en el contrato de integración |

## 6. Roadmap y acciones inmediatas actualizadas

El calendario de 18 meses no cambia. La integración FileStudio se sitúa en paralelo a Fase 1 (meses 2-4) con entrega antes del cierre de Fase 2 (mes 8). Las **tres acciones de 30 días del plan v1 se mantienen** (Fase 0 con la demo como centro; freemium + beta cerrada hispanohablante; writer EPUB con EPUBCheck) y se añade:

**Acción 4 — Prototipo de integración acotado (semana 1-4)**: optimización de imagen de portada en tres resoluciones desde Talent hacia el Agente Local de FileStudio, reutilizando `pairing.ts` sin modificarlo, con `requestingApp: "anclora-talent"`. Es la prueba de concepto de menor esfuerzo y mayor señal: valida el Modo 1, desbloquea el mensaje de privacidad y ejercita el precedente de integración documentado en `docs/integrations/anclora-nexus/`. Gate: el mensaje "procesamiento local verificable" solo se publica cuando este prototipo funcione en producción.

---

## Referencias

[^FS1^]: Repositorio `anclora-filestudio`, `apps/api/src/routes/agent.ts` — `AgentJobRecord` con campos `requestingOrg`/`requestingApp` (valores de ejemplo "Nexus"/"Contract"); `docs/integrations/anclora-nexus/`. Dump del repo, estado a 2026-08-03.
[^FS2^]: Repositorio `anclora-filestudio`, `docs/privacy.md` y `docs/security.md` — web local-first sin subida de contenido a `/api/*`, Agente Local sin puertos entrantes, consentimiento `ask-always`, tokens de descarga de un solo uso con expiración.
[^FS3^]: Repositorio `anclora-filestudio`, `README.md` y `docs/format-matrix.md` — motores Sharp, QPDF/pdf-lib, FFmpeg, Tesseract, LibreOffice/Pandoc, Calibre; categoría "Interna".
[^FS4^]: Historial de commits de `anclora-filestudio` en GitHub (junio-agosto 2026): parches de seguridad de dependencias, alineación de marca, releases portables Windows v0.2.6, clasificación de errores yt-dlp.
[^FS5^]: Documento "Análisis de colaboración Anclora Talent × Anclora FileStudio" (Claude, 2026-08-04), sección 5 (riesgos y gobernanza), aportado por el usuario.
[^V1^]: "Plan de mejora definitivo para Anclora Talent" (v1, 2026-08-04): fases F0-F4, matriz de priorización, benchmark competitivo y verificación cruzada de fuentes en `/mnt/agents/output/research/`.
