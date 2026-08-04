# API Flow — Talent → FileStudio

## Emisión de trabajos

Los trabajos se emiten exclusivamente desde el servidor de Talent (server
actions o route handlers). El cliente de navegador nunca habla con FileStudio.

1. Talent clasifica el archivo y aplica la política de routing (`routing-policy.md`).
2. Si el modo es Service API: `POST /api/v1/uploads` y luego `POST /api/v1/jobs`
   con `Idempotency-Key` obligatorio. Reusar la clave con un body distinto
   devuelve `IDEMPOTENCY_CONFLICT` (bug del emisor; no reintentar).
3. Si el modo es Agente Local: el trabajo se encola como `AgentJobRecord` con
   `requestingOrg: "anclora"`, `requestingApp: "anclora-talent"`,
   `retentionMinutes` y `timeoutMs` declarados por Talent.
4. FileStudio (worker o Agente Local) procesa la conversión.
5. Talent conoce el resultado vía webhook (preferente) o polling de estado.
6. Talent descarga el resultado con un token de descarga de un solo uso
   (TTL 15 min) y lo persiste en Blob como asset del proyecto.

## Estados del trabajo

`queued → processing → completed | failed | cancelled | expired`

En ruta Agente Local los estados internos de FileStudio son
`available | leased | completed | failed | rejected | cancelled`; Talent los
proyecta a su máquina de estados propia y nunca expone los internos en UI.

## Polling vs webhook

- **Webhook preferente** para `completed`/`failed` (ver `webhook-flow.md`).
- **Polling de respaldo** con backoff exponencial (5 s → 60 s, tope 10 min)
  solo mientras el trabajo esté activo o si no se recibió webhook en 2 min.

## Expiración

- Trabajos Agente Local sin agente disponible expiran: TTL propuesto 30 min
  para operaciones ligeras, 4 h para OCR/audio-vídeo.
- Tokens de descarga: un solo uso, TTL 15 min. Si expira, Talent solicita uno
  nuevo con `filestudio:results:read` mientras el trabajo siga en `completed`.

## Cola con reintentos y circuit breaker (umbrales propuestos)

| Parámetro | Valor propuesto |
|---|---|
| Reintentos por trabajo (errores transitorios 5xx/red) | 3, backoff 30 s / 2 min / 10 min |
| Errores no reintentables | `IDEMPOTENCY_CONFLICT`, `OUTPUT_HASH_MISMATCH`, `UPLOAD_TOO_LARGE`, 4xx de validación |
| Circuit breaker — apertura | 5 fallos consecutivos o 50 % de fallos en ventana de 5 min |
| Circuit breaker — semi-abierto | 1 trabajo sonda cada 60 s |
| Circuit breaker — comportamiento abierto | trabajos quedan `queued`, UI muestra "procesamiento en espera" |
