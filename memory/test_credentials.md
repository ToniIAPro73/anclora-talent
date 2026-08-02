# Test credentials

La autenticación es propia (email + contraseña sobre Neon); ya no se usa Clerk.

## Usuario E2E (entorno de desarrollo)

- Email: `e2e.auth@anclora-talent.test`
- Password: `E2ePassword123`
- Nombre: `E2E Auth Bot`

El spec `e2e/auth-login.spec.ts` provisiona esta cuenta automáticamente vía
`POST /api/auth/register` (tolera 409 si ya existe). Los tests de registro crean
cuentas adicionales con email único por ejecución (`e2e.register.<timestamp>@anclora-talent.test`).

## Notas

- Estas credenciales solo existen en la base de datos de desarrollo (`DATABASE_URL` de `.env.local`).
- Las contraseñas se persisten como hash bcrypt; en `sessions` solo se guarda el SHA-256 del token.
- Impacto resuelto: el flujo autenticado completo (login → dashboard → logout) ya está automatizado end-to-end.
