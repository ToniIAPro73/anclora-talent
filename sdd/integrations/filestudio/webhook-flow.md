# Webhook Flow — FileStudio → Talent

## Endpoint receptor

Propuesta: `src/app/api/integrations/filestudio/webhook/route.ts`
(route handler `POST`, sin sesión de Clerk; autenticación por firma).

La URL registrada en FileStudio debe ser HTTPS pública: FileStudio rechaza
URLs que resuelvan a rangos privados, loopback, link-local o metadata.

## Verificación de firma

Antes de mutar ningún estado, el handler verifica, en este orden:

1. **Firma HMAC** del cuerpo con el secreto del endpoint registrado.
2. **Frescura del timestamp**: rechazar eventos con más de 5 minutos de
   antigüedad (anti-replay).
3. **Idempotencia**: la clave de idempotencia del evento se persiste; un
   evento ya procesado responde `200` sin efectos.

Cualquier fallo de verificación responde `401`/`400` y no toca la base de
datos.

## Eventos y efectos

| Evento | Efecto en Talent |
|---|---|
| `job.completed` | marca el trabajo `completed`, descarga el resultado con token de un solo uso, lo persiste en Blob |
| `job.failed` | marca `failed` con el código de error mapeado (`error-mapping.md`) |
| `job.cancelled` | marca `cancelled` |

## Reintentos

- Si Talent responde no-2xx, FileStudio reintenta la entrega; por eso la
  idempotencia es obligatoria y el handler debe ser rápido (persistir evento y
  encolar el trabajo pesado, p. ej. la descarga del resultado, fuera del
  request).
- Si el webhook no llega en 2 minutos, el polling de respaldo de `api-flow.md`
  cubre el hueco; ambos caminos convergen en la misma mutación idempotente.
