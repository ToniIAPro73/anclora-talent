# Fase 1b — Integración FileStudio (Agente Local) — plan de mejora v2

Cerrada (código): 2026-08-04. Rama `development`. Contrato: `sdd/integrations/filestudio/` (8 docs, verificados contra el código de FileStudio).

## Entregables

1. **Contrato de integración** — `sdd/integrations/filestudio/`: overview, api-flow, authentication, webhook-flow, routing-policy (Modo 1/2/3), error-mapping, exclusions (yt-dlp fuera), hardening (threat model multi-tenant, límites, SLA, reclasificación → decisión del dueño).
2. **Cliente** — `src/lib/filestudio/`: emisión Service/Agent con `requestingOrg:"anclora"`/`requestingApp:"anclora-talent"`, circuit breaker (5 fallos/60 s), backoff 30s/2m/10m, polling, descarga token un solo uso; pairing Ed25519 + código 6 dígitos con credenciales AES-256-GCM; consent ask-always persistido; webhook HMAC `X-Anclora-Signature` (±300 s, timing-safe, dedupe). Tablas: `filestudio_connections`, `filestudio_consents`, `filestudio_jobs`, `filestudio_webhook_events`. Feature flag `FILESTUDIO_API_URL` (sin config = integración invisible).
3. **Prototipo end-to-end** — optimización de portada en 3 resoluciones (1600/800/400 px, sharp `image:resize`, un trabajo por ancho): `optimizeCoverAction` con auth, límites por usuario (3 concurrentes/50 día), routing Modo 1 (consent) ↔ Modo 2 (fallback declarado), descarga diferida → Vercel Blob, polling de respaldo a los 2 min, procedencia persistida (`options` jsonb) para el manifiesto de F2. UI en cover studio bajo flag.
4. **Indicador de modo** — `ProcessingModeBadge` (local/service/navegador) reutilizable; cada trabajo muestra el modo real usado.
5. **Endurecimiento** — `hardening.md`: reclasificación Interna → producto documentada como decisión del dueño (0,5–1 p-m, casi todo en Talent; la auth de FileStudio valida scope de app, Talent aplica límites por usuario en su lado).

## Commits

- `6144748` feat(f1b): cliente FileStudio (emisión, circuit breaker, cola)
- `760d274` fix(db): migración columnas FASE C (drift preexistente)
- `17fd651` feat(f1b): pairing y consent Agente Local
- `c9d33b8` feat(f1b): webhook + indicador modo de procesamiento
- `eb677aa` feat(f1b): prototipo optimización de portada 3 resoluciones (emisión)
- `89bb251` feat(f1b): recepción de resultados FileStudio → Vercel Blob
- `2cec2a2` feat(f1b): UI prototipo optimización de portada en cover studio

## Desviaciones (gana el código)

- Approve de pairing real: `POST /api/v1/admin/agent-pairing-requests/:id/approve` (scope admin) — la UI pide request id + código; `public_key` nullable hasta contrato versionado.
- Webhook sin event id → dedupe `type:jobId:signature-timestamp`.
- 3 trabajos `image:resize` (no hay operación multi-salida en FileStudio).
- **Gap de contrato (requiere FileStudio)**: `POST /api/v1/agent-jobs` aún no existe y el Agente Local no soporta `image:resize` (solo `data.*` e `image.png-to-webp`). End-to-end validado con tests que mockean fielmente esos contratos; validación real pendiente en staging con agente vivo. Refresh de token de dispositivo pendiente del contrato versionado.

## Puerta de marketing

- El mensaje "procesamiento local verificable" NO se comunica en UI/landing hasta que el prototipo funcione en staging/producción con agente real (regla del prompt maestro). Vigente.
