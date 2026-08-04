# Error Mapping — FileStudio → UX de Talent

El usuario nunca ve códigos de FileStudio. Talent traduce cada código a una
acción de producto y un mensaje en lenguaje editorial.

| Código FileStudio | Acción de Talent | Mensaje al usuario |
|---|---|---|
| `AUTH_INVALID_TOKEN` / `AUTH_EXPIRED_TOKEN` | refrescar token de servicio y reintentar una vez | — (transparente) |
| `AUTH_INSUFFICIENT_SCOPE` | error de configuración de la integración; alerta interna | "La conversión no está disponible ahora mismo. Inténtalo más tarde." |
| `PAIRING_CODE_INVALID` | pedir al admin que reintroduzca el código | "Código incorrecto. Comprueba el código que muestra el Agente Local." |
| `PAIRING_TOO_MANY_ATTEMPTS` / `PAIRING_EXPIRED` | reiniciar el pairing desde cero | "El código ha caducado. Genera uno nuevo en el Agente Local." |
| `AGENT_DEVICE_REVOKED` / `AUTH_REFRESH_REUSE_DETECTED` | marcar dispositivo como desconectado; ofrecer re-emparejar | "Este dispositivo se ha desvinculado. Vuelve a emparejarlo para procesar en local." |
| `AGENT_REPAIR_REQUIRED` | guiar re-emparejado del agente | "El Agente Local necesita reconectarse." |
| `OPERATION_UNAVAILABLE` | re-ejecutar la política de routing en otro modo | "Esta operación no está disponible en ese modo; la hemos movido a otro procesador." |
| `UPLOAD_TOO_LARGE` | enrutar a Agente Local o rechazar | "El archivo supera el tamaño máximo para este modo de procesamiento." |
| `OUTPUT_HASH_MISMATCH` | resultado tratado como fallido; alerta interna, no reintentar a ciegas | "El resultado no pasó la verificación de integridad. Vamos a reintentarlo." |
| `IDEMPOTENCY_CONFLICT` | bug del emisor; detener reintento y registrar | — (error interno, no visible) |
| `VALIDATION_FAILED` | corregir la petición; no reintentar | — (error interno, no visible) |
| Rechazo por consentimiento (ask-always) | estado `failed` recuperable | "El procesamiento local fue rechazado en tu dispositivo. Puedes reintentarlo o elegir otro modo." |
| Agente Local apagado / timeout de cola | ver `hardening.md` | "Tu dispositivo está desconectado. El trabajo esperará o puedes procesarlo en la nube privada." |
