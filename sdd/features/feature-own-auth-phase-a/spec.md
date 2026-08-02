# Feature: Own Auth (Fase A) — retirada de Clerk y pantalla de login contractual

## Objetivo

Sustituir Clerk por autenticación propia dentro del propio Next.js (sin servicios externos),
con credenciales email+password sobre Neon y una pantalla de login que cumple
`ANCLORA_AUTH_LOGIN_SCREEN_CONTRACT v1.3.0`.

## Contexto

La app dependía de `@clerk/nextjs` para provider, middleware, guards, widgets de sign-in/sign-up
y botón de usuario. La Fase A (de 3) retira esa dependencia por completo y deja el acento visual
consumiendo tokens del design system para que la Fase B pueda re-brandear sin tocar la pantalla.

## Decisiones estructurales

- Tablas `users` (email único lowercase, `password_hash` bcrypt vía `bcryptjs`) y `sessions`
  (id = SHA-256 del token opaco de 32 bytes, FK cascade, expiración 30 días con renovación
  deslizante). Migración `src/db/migrations/0002_cultured_scorpion.sql` y pasos idempotentes en
  `scripts/ensure-migrations.js`.
- Cookie de sesión `anclora_session`: `httpOnly; Secure; SameSite=Lax; Path=/`; solo el hash se
  persiste. Constantes compartidas en `src/lib/auth/constants.ts` (sin `server-only` para poder
  usarlas en el proxy).
- Route handlers `src/app/api/auth/{register,login,logout,me}`:
  - register: validación email + password (≥8, letra y número), 409 si el email existe.
  - login: 401 genérico, rate-limit en memoria por IP+email (5 intentos / 10 min) y verificación
    contra hash dummy cuando la cuenta no existe (anti timing-enumeration); `timingSafeEqual` en
    la comparación del id de sesión.
- Guards `src/lib/auth/guards.ts`: `getCurrentUser()`, `requireUser()`, `requireUserId()`
  (firma compatible con la versión Clerk: devuelve `userId` string o redirige a `/sign-in`).
- Proxy `src/proxy.ts` + `src/lib/auth/middleware.ts`: gate por presencia de cookie en
  `/dashboard`, `/projects`, `/api/blob` (401 JSON para API); validación fuerte en servidor.
- Pantallas `/sign-in` y `/sign-up` con `LoginPageContent`/`RegisterPageContent` propios;
  eliminados `AuthShell` y `clerkAppearance.ts`. Clases `.talent-auth-*` en `globals.css`
  consumen solo tokens (`--accent`, `--auth-card-surface`, …), nunca hex.
- `AppShell` usa `UserMenu` propio (nombre/email + "Cerrar sesión"); `LegalFooter` excluido de
  rutas de auth.
- `users.id` (uuid) alimenta los `userId` `varchar(191)` existentes; la tabla legacy `app_users`
  queda sin uso activo.

## Resultado esperado

- Login contractual (logo 50px sin anillo, orden de elementos, social deshabilitado, textos
  ES/EN, sin scroll a 1366×768) como primera pantalla de la app.
- Flujo completo register → login → dashboard → logout automatizado en E2E.
- Suite Vitest verde, lint limpio y `tsc` sin errores nuevos sobre el baseline (~99).
