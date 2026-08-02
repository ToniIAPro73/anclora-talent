# Feature: Login social OAuth (Google + GitHub)

Estado: implementado (2026-08-02, rama `development`).

## Contexto

La app ya tenía auth propia por credenciales (Fase A). Esta fase añade login social replicando
la arquitectura del repo hermano anclora-fiscal (`apps/api/src/{google,github}-oauth-*.ts`),
adaptada a same-origin: en Fiscal el API era un proceso separado con proxy cross-origin; aquí
todo vive en Route Handlers del propio Next.js. Sin NextAuth/Auth0/Clerk ni librerías OAuth de
terceros: PKCE implementado a mano con `node:crypto`.

## Arquitectura

```
src/lib/auth/oauth/
├── google-config.ts / github-config.ts   # env → config | null (parcial → throw, fail fast)
├── pkce.ts                               # createOAuthTransaction (state/verifier/challenge S256)
│                                         # oauthStatesMatch (timingSafeEqual)
├── google-flow.ts / github-flow.ts       # URL de autorización por proveedor
├── google-client.ts / github-client.ts   # code→token→identidad verificada (fetch inyectable)
├── transaction-cookie.ts                 # cookie talent_{provider}_oauth (base64url JSON, 10 min)
├── providers.ts                          # registry: parse/config/url/resolve por proveedor
├── identity.ts                           # loginWithExternalIdentity (vinculación)
├── audit.ts                              # hashEmailForAudit (SHA-256, nunca email en claro)
└── availability.ts                       # flags server-side para la UI (server-only)
```

Endpoints (GET, same-origin):

- `/api/auth/oauth/{provider}/start` — 503 `PROVIDER_OAUTH_NOT_CONFIGURED` si el proveedor no
  está configurado; si lo está, persiste la transacción en cookie `talent_{provider}_oauth`
  (`httpOnly; Secure; SameSite=Lax`, TTL 10 min) y redirige (302) a la URL de autorización.
  Rate-limit: 10 req / 15 min por IP (`checkOAuthRateLimit`/`recordOAuthAttempt` en
  `src/lib/auth/rate-limit.ts`, mismo patrón que el de login).
- `/api/auth/oauth/{provider}/callback` — borra SIEMPRE la cookie de transacción. `error` del
  proveedor → `/sign-in?oauth={provider}_cancelled`; cookie ausente/expirada o `state` que no
  coincide (`timingSafeEqual`) → `_invalid_state`; intercambio con `code_verifier`
  (`https://oauth2.googleapis.com/token` / `https://github.com/login/oauth/access_token`) e
  identidad (`openidconnect.googleapis.com/v1/userinfo` / `api.github.com/user` + `/user/emails`).
  Emails no verificados rechazados (Google: `email_verified=false`; GitHub: solo `verified` +
  `primary`). Email normalizado a minúsculas. Fallos de intercambio → `_error` sin detalles
  sensibles. Éxito → `loginWithExternalIdentity` + `createSession` (misma cookie
  `anclora_session` que credenciales) + 302 a `/dashboard`.

## Vinculación de identidad

`loginWithExternalIdentity({provider, providerAccountId, email, fullName})` (email ya verificado
por el cliente OAuth):

1. Existe identidad `(provider, providerAccountId)` → devuelve el usuario vinculado.
2. Si no, existe usuario con ese email → inserta la identidad vinculada a ese usuario.
3. Si no existe → crea el usuario sin contraseña (`password_hash = NULL`) y vincula.

Modelo de datos: tabla `oauth_identities` (`user_id` FK cascade a `users`, `provider`,
`provider_account_id`, `email`, unique compuesto `(provider, provider_account_id)`);
`users.password_hash` pasa a nullable. Migración `src/db/migrations/0003_hard_nitro.sql` +
pasos idempotentes en `scripts/ensure-migrations.js`.

## Decisiones

- **PKCE en GitHub aunque no lo exija**: unifica el flujo con Google y añade defensa en profundidad.
- **GitHub sin fallback a email secundario**: a diferencia de Fiscal (que aceptaba cualquier email
  verificado), aquí solo se acepta el email `primary` + `verified`, por especificación contractual.
- **Config parcial = fail fast**: `read{Google,GitHub}OAuthConfig` lanza; los endpoints de OAuth
  fallan ruidosamente (500). La página de login es la excepción deliberada: `availability.ts`
  captura el error, lo loguea y degrada el botón a disabled para no romper el login por
  credenciales ante un despliegue mal configurado.
- **`/sign-in` con `force-dynamic`**: la disponibilidad de proveedores se lee de `process.env` en
  cada request y se pasa como prop `oauthAvailability` a `LoginPageContent` (preferido sobre flags
  `NEXT_PUBLIC_*`, que quedarían horneados en el build).
- **Sin fallback a `/api/auth/me` tras el callback**: la cookie de sesión es `SameSite=Lax` y el
  callback termina en una navegación top-level GET a `/dashboard`, así que la cookie viaja en la
  primera navegación. El chequeo same-origin del login-form de Fiscal solo haría falta con
  `SameSite=Strict`.
- **Auditoría sin PII**: logins sociales logueados con SHA-256 del email
  (`hashEmailForAudit`), nunca el email en claro. Errores de intercambio logueados con mensaje
  genérico.
- **Fixtures de test GitGuardian-safe**: credenciales fake construidas en runtime
  (`fakeCred(...parts)`), patrón ya usado en `password.test.ts`.

## Tests

- Unitarios (24 nuevos): configs (null sin variables, throw con parcial, URL inválida), PKCE
  (formato, unicidad, challenge S256, comparación constante), clientes con fetch mockeado
  (identidad verificada, email no verificado rechazado, error de intercambio sin detalles),
  vinculación (login recurrente, link por email, alta social), routes start/callback (503, 302
  con cookie, rate-limit, cancelled/invalid_state/error, sesión creada).
- e2e `e2e/auth-oauth.spec.ts` (6 tests): fallback sin configurar (503, botones disabled,
  feedback `?oauth=` ES/EN) y flujo configurado levantando un `next start` propio en :3210 con
  credenciales fake (302 con parámetros PKCE correctos, botones habilitados que navegan vía el
  endpoint start). No requiere OAuth real.

## Variables de entorno

`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_CALLBACK_URL` y
equivalentes `GITHUB_*`. Placeholders e instrucciones de registro (Google Cloud Console / GitHub
OAuth Apps, callbacks `/api/auth/oauth/{provider}/callback` en dev y producción) en `README.md`
y `memory/test_credentials.md`. Los valores reales NO se commitean.
