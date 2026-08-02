<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/paleta_colores_anclora_talent.png" alt="Anclora Talent" width="120" />

# Anclora Talent

### Repositorio interno del ecosistema Anclora para operaciones de familia premium

**Español** · [English](./README.en.md)

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Documentation](https://img.shields.io/badge/documentation-premium-BFA46A)
![Languages](https://img.shields.io/badge/languages-ES%20%7C%20EN-047857)

</div>

---

> [!IMPORTANT]
> Repositorio interno del ecosistema Anclora. No publicar detalles operativos, credenciales,
> datos reales ni logica sensible fuera de los canales autorizados.

## Vista rapida

| Area | Definicion |
| --- | --- |
| Proposito | Repositorio interno del ecosistema Anclora para operaciones de familia premium |
| Familia | `premium` |
| Visibilidad | `private` |
| Rol | Repositorio de trabajo interno |

## Flujo conceptual

```text
Contexto interno
      ↓
Configuracion y datos controlados
      ↓
Logica de producto
      ↓
Revision tecnica
      ↓
Entrega o soporte operativo
```

## Arranque local

```bash
npm install
npm run dev
```

## Tecnologia

| Area | Detalle |
| --- | --- |
| Next.js | Detectado en el repositorio |
| React | Detectado en el repositorio |
| TypeScript | Detectado en el repositorio |
| Tailwind CSS | Detectado en el repositorio |
| Drizzle ORM | Detectado en el repositorio |
| Auth propia | Credenciales (bcrypt) + sesiones opacas persistidas en Neon; sin servicios externos |
| Zod | Detectado en el repositorio |
| Vitest | Detectado en el repositorio |

## Documentacion

- [Documentacion](./docs)

## Login social OAuth (Google + GitHub)

La auth sigue siendo 100% propia (sin NextAuth ni librerías OAuth): el flujo Authorization Code + PKCE (S256) está implementado a mano sobre `crypto` de Node en `src/lib/auth/oauth/`, con Route Handlers same-origin:

- `GET /api/auth/oauth/{provider}/start` → crea la transacción PKCE, la persiste en la cookie `talent_{provider}_oauth` (`httpOnly; Secure; SameSite=Lax`, TTL 10 min) y redirige (302) a la URL de autorización del proveedor. Rate-limit: 10 req / 15 min por IP. Si el proveedor no está configurado → `503 PROVIDER_OAUTH_NOT_CONFIGURED`.
- `GET /api/auth/oauth/{provider}/callback` → valida `state` con `timingSafeEqual`, intercambia el código (con `code_verifier`), obtiene la identidad verificada, la vincula (`loginWithExternalIdentity`: login recurrente por `providerAccountId`, vinculación por email verificado, o alta de usuario sin contraseña) y crea la misma sesión `anclora_session` que el login por credenciales. Errores → redirect a `/sign-in?oauth={provider}_{cancelled|invalid_state|error}`.
- Tabla `oauth_identities` (unique `(provider, provider_account_id)`, FK cascade a `users`); `users.password_hash` ahora es nullable. Migración `src/db/migrations/0003_hard_nitro.sql` + pasos idempotentes en `scripts/ensure-migrations.js`.
- Auditoría: los logins sociales se registran con el hash SHA-256 del email, nunca el email en claro.

### Variables de entorno (no commitear valores reales)

| Variable | Descripción |
| --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` | Client ID de Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (tipo Web) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client Secret del mismo cliente |
| `GOOGLE_OAUTH_CALLBACK_URL` | `http://localhost:3000/api/auth/oauth/google/callback` en dev; `https://<dominio>/api/auth/oauth/google/callback` en producción |
| `GITHUB_OAUTH_CLIENT_ID` | Client ID de GitHub → Settings → Developer settings → OAuth Apps |
| `GITHUB_OAUTH_CLIENT_SECRET` | Client Secret de la OAuth App |
| `GITHUB_OAUTH_CALLBACK_URL` | `http://localhost:3000/api/auth/oauth/github/callback` en dev; `https://<dominio>/api/auth/oauth/github/callback` en producción |

Registra exactamente esas callback URLs como "Authorized redirect URIs" (Google) / "Authorization callback URL" (GitHub) en cada consola. Comportamiento de configuración:

- Ninguna variable del proveedor definida → proveedor desactivado (botón disabled "Próximamente" en la UI).
- Configuración parcial o callback URL inválida → error en arranque del flujo (fail fast); los endpoints responden 500 y la página de login degrada el botón con un error en logs.

## Gobernanza

- Producto canonico: `anclora-talent`
- Boveda: `/mnt/c/Users/antonio.ballesterosa/Desktop/Proyectos/Boveda-Anclora`
- Contratos: `contracts/` y `docs/governance/`
- Asset de marca: `presente`

---

<div align="center">

### Anclora Group · Uso interno

</div>
