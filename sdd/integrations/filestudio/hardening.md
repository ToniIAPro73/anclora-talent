# Hardening — Reclasificación de FileStudio a infraestructura de producto

Estado: **propuesta para el dueño del producto**. Hasta su aprobación, FileStudio
sigue clasificado como dependencia **interna** del ecosistema Anclora (consumidor
de referencia: Nexus). Este documento recoge lo necesario para reclasificarlo a
**infraestructura de producto consumida por usuarios finales de Talent**.

Regla de alcance: **Talent no modifica el repo FileStudio.** La única excepción
admisible es un contrato de API versionado (`/api/v1/*` con fixtures y changelog),
acordado con el dueño de FileStudio si los gaps de este documento lo requieren.

## 1. Threat model: qué cambia con un consumidor multi-tenant externo

Referencia base: `docs/implementation/anclora-filestudio-service-api/threat-model.md`
en el repo FileStudio (A-01 a A-18). Ese modelo asume consumidores **internos de
confianza** (Nexus): los scopes JWT validan identidad de *aplicación*, no de
*usuario final*. Con Talent como consumidor, los usuarios finales son personas
externas multi-tenant y el modelo cambia así:

| Amenaza | Modelo actual (Nexus interno) | Con usuarios Talent |
|---|---|---|
| Identidad autorizada | Scope `filestudio:*` por app cliente | El scope valida a Talent, no al usuario; **la autorización por usuario es responsabilidad de Talent** (sesión + ownership del proyecto antes de emitir el trabajo) |
| A-12 DoS por jobs infinitos | Límite por cliente = límite por app | Un solo usuario abusivo agota la cuota de **toda la app**; se requieren límites por usuario en Talent (§2) |
| A-07 Escape de tenant | Aislamiento por `client_id` del JWT | Todos los trabajos de Talent comparten un `client_id`; el aislamiento entre usuarios vive **solo en Talent** (job ↔ proyecto ↔ usuario en su DB) |
| A-01 Archivo malicioso | Cliente interno semi-confiable | El archivo lo sube un usuario final anónimo: la validación de entrada (magic bytes, MIME, tamaño, lista blanca) pasa a ser frontera con Internet, no con un socio |
| A-11 Pairing fraudulento | Admin interno de Nexus | El admin que aprueba pairings es un usuario Talent con rol admin: la UI de aprobación debe verificar rol y mostrar dispositivo con claridad |
| A-17 Robo de refresh token | Equipo corporativo del ecosistema | El Agente Local corre en el dispositivo **del usuario final**: asumir host potencialmente comprometido; la revocación desde Talent es la mitigación primaria |

Conclusión: el hardening **no exige cambios en FileStudio** para la F1b; exige
que Talent aplique los límites y la autorización por usuario en su propio lado
(§2) y que el dueño decida la reclasificación formal (§4).

## 2. Límites por usuario de Talent

FileStudio limita por *app cliente*; Talent añade una capa por *usuario* antes de
emitir cualquier trabajo. Valores propuestos (configurables por plan):

| Límite | Valor propuesto |
|---|---|
| Trabajos activos por usuario | 3 concurrentes; el resto queda `queued` |
| Cuota diaria por usuario | 50 trabajos/día (OCR y audio/vídeo cuentan ×5) |
| Rate limit de emisión | 10 trabajos/minuto por usuario |
| Post-proceso PDF | ≤ 50 MB entrada, ≤ 500 páginas |
| Imágenes a 3 resoluciones | ≤ 25 MB por imagen fuente |
| OCR de ingesta | ≤ 50 páginas (límite duro de FileStudio, `docs/security.md`) |
| Audio/vídeo ligero | ≤ 200 MB, ≤ 30 min de duración |
| Tamaño máx. subida Service API | 50 MB (límite ebook de FileStudio) |

Los límites se verifican en el servidor de Talent **antes** de crear el trabajo;
un exceso responde con mensaje de producto ("has alcanzado tu límite diario"),
nunca con un código de FileStudio. Los límites por app de FileStudio quedan como
red de seguridad, no como mecanismo visible.

## 3. Operación

### SLA propuesto (a acordar con el dueño de FileStudio)

| Métrica | Objetivo |
|---|---|
| Disponibilidad Service API | 99,5 % mensual |
| p95 post-proceso PDF / imágenes | < 30 s |
| p95 OCR (50 págs) | < 5 min |
| p95 audio/vídeo ligero | < 10 min |
| Entrega de webhooks | < 1 min desde `completed`/`failed` |

### Monitorización compartida

- Talent registra por trabajo: modo, operación, duración, código de error
  mapeado y si hubo degradación de modo consentida.
- Panel compartido con el equipo de FileStudio: tasa de fallo por operación,
  saturación de cola, circuit breaker abierto (`api-flow.md`), pairings activos
  y revocaciones.
- Alerta conjunta si la tasa de fallo de una operación supera el 10 % en 1 h.

### Agente Local apagado

| Situación | Comportamiento de Talent |
|---|---|
| Trabajo encolado sin agente disponible | Permanece `queued` con TTL: 30 min (ligero) u OCR/audio-vídeo 4 h (`api-flow.md`) |
| Expiración del TTL | Estado `expired`; el usuario puede reintentar o cambiar de modo con consentimiento |
| UX de espera | Indicador "Esperando a tu dispositivo" con tiempo restante y acciones: reintentar, procesar en la nube privada (opt-in explícito) o cancelar |
| Sin degradación silenciosa | Cambiar de modo requiere consentimiento del usuario (regla innegociable de `routing-policy.md`) |

## 4. Decisión para el dueño: reclasificación

**Propuesta**: reclasificar FileStudio de dependencia *interna* a *infraestructura
de producto consumida por usuarios finales de Talent*, manteniendo el repo y su
operación bajo el equipo de FileStudio.

Checklist de reclasificación:

- [ ] Aprobar el threat model revisado (§1) y registrar que la autorización por
      usuario final es responsabilidad de Talent
- [ ] Acordar el contrato de API versionado (`/api/v1/*` + fixtures + changelog)
      como única superficie de acoplamiento entre repos
- [ ] Acordar SLA y panel de monitorización compartida (§3)
- [ ] Validar los límites por usuario de §2 contra la capacidad real del Service
      API y del Agente Local
- [ ] Definir procedimiento de incidente conjunto (canal, severidades, quién
      comunica al usuario final)
- [ ] Confirmar que la exclusión de yt-dlp (`exclusions.md`) se mantiene

**Esfuerzo estimado: 0,5–1 persona-mes**, casi todo en el lado Talent (capa de
límites por usuario, UX de espera, panel compartido) más sesiones de acuerdo de
SLA/contrato con el equipo de FileStudio. No se estima trabajo en el repo
FileStudio salvo la formalización del contrato versionado, si se decide.
