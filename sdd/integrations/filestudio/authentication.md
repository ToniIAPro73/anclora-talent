# Autenticación — Talent ↔ FileStudio

## Service API: JWT por scope

Las peticiones de servicio de Talent usan JWT bearer con claims de scope.
Scopes requeridos por Talent:

- `filestudio:uploads:create`
- `filestudio:jobs:create`
- `filestudio:jobs:read`
- `filestudio:jobs:cancel`
- `filestudio:results:read`
- `filestudio:webhooks:manage`
- `filestudio:admin` — solo para aprobar/rechazar pairings del Agente Local
  desde la UI de administración de Talent

Tokens, refresh tokens y claves privadas nunca se registran en logs ni viajan
en query strings.

## Pairing del Agente Local

Flujo (referencia: `apps/local-agent/src/pairing.ts` en FileStudio):

1. El Agente Local genera un par de claves Ed25519 en el dispositivo.
2. Solicita un código de pairing de un solo uso: **6 dígitos, TTL 10 minutos**,
   máximo 20 intentos de verificación.
3. Un administrador introduce el código en la UI de Talent (server action con
   scope `filestudio:admin` que llama al endpoint de aprobación de FileStudio).
4. FileStudio emite access token de corta vida (10 min) + refresh token
   rotativo (30 días). La reutilización de un refresh token revoca el
   dispositivo (`AUTH_REFRESH_REUSE_DETECTED`).
5. El agente guarda las credenciales cifradas en su credential store y publica
   capacidades y heartbeats por HTTPS saliente. No abre puertos de entrada.

Talent puede desemparejar/revocar un dispositivo desde administración.

## Consentimiento ask-always

La política por defecto del Agente Local es **ask-always**: cada trabajo
muestra al usuario del dispositivo org, app (`anclora-talent`), operación,
nombre de archivo, tamaño y retención, y requiere aprobación explícita. En
modo no interactivo (sin TTY) el agente **rechaza** el trabajo en lugar de
aceptarlo en silencio. Talent debe tratar un rechazo por consentimiento como
estado `failed` recuperable por el usuario, no como error de sistema.

## Tokens de descarga de un solo uso

- Generados con bytes aleatorios criptográficamente seguros; FileStudio solo
  almacena el hash SHA-256.
- TTL 15 minutos; invalidados al primer acceso; nunca en logs.
- Talent los usa una única vez en servidor para volcar el resultado a Blob y
  descarta el token inmediatamente.
