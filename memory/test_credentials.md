# Test credentials

La autenticación es propia (email + contraseña sobre Neon); ya no se usa Clerk.

## Usuario E2E (scope QA persistente en Neon canónico)

- Email: `e2e.auth@anclora-talent.test`
- Password: read only from `E2E_AUTH_PASSWORD` in `.env.local`; never store it in repository documentation.
- Nombre: `E2E Auth Bot`

El spec `e2e/auth-login.spec.ts` provisiona esta cuenta automáticamente vía
`POST /api/auth/register` (tolera 409 si ya existe). Los tests de registro crean
cuentas adicionales con email único por ejecución (`e2e.register.<timestamp>@anclora-talent.test`).

## Notas

- Estas credenciales identifican exclusivamente al usuario QA persistente en el Neon canónico. El agente debe usar ese usuario y trabajar solo con sus proyectos; nunca usar la cuenta personal/producción de Toni. `.env.local` guarda el secreto local y el script `npm run dev` resuelve el mismo Neon desde Vercel Development.
- Las contraseñas se persisten como hash bcrypt; en `sessions` solo se guarda el SHA-256 del token.
- Impacto resuelto: el flujo autenticado completo (login → dashboard → logout) ya está automatizado end-to-end.

## Login social OAuth (Google + GitHub)

El flujo OAuth es propio (Authorization Code + PKCE S256, sin librerías externas). No hay
credenciales reales en el repo: configura estas variables en `.env.local` (nunca las commitees):

```bash
# Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (Web)
GOOGLE_OAUTH_CLIENT_ID=<tu-client-id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<tu-client-secret>
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:3000/api/auth/oauth/google/callback

# GitHub → Settings → Developer settings → OAuth Apps
GITHUB_OAUTH_CLIENT_ID=<tu-client-id>
GITHUB_OAUTH_CLIENT_SECRET=<tu-client-secret>
GITHUB_OAUTH_CALLBACK_URL=http://localhost:3000/api/auth/oauth/github/callback
```

- Registra la callback URL exacta en cada consola (`/api/auth/oauth/{provider}/callback`), tanto la
  de dev (`http://localhost:3000/...`) como la de producción (`https://<dominio>/...`).
- Sin variables del proveedor → botón deshabilitado ("Próximamente") y `start` responde 503.
- Configuración parcial → fail fast (error); revisa los logs del servidor.
- El spec `e2e/auth-oauth.spec.ts` levanta un `next start` propio (puerto 3210) con credenciales
  fake construidas en runtime; no hace falta OAuth real para los tests.
