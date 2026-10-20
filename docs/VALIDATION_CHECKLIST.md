# Checklist de validación — lint del spec e2e 413

**Repositorio:** anclora-talent
**Rama y commit validado:** `development` @ `2c18944`
**Alcance:** `e2e/qa-remediation-413-three-docs.spec.ts` tenía en la línea 8 un literal con comillas rotas (`'process.env.E2E_AUTH_PASSWORD ?? ...'`). El commit lo cambia para leer la contraseña QA de `process.env.E2E_AUTH_PASSWORD`, sin credencial en el código.

## Comprobaciones ejecutadas

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Lint | `npm run lint` | PASS — 0 errores |
| Typecheck | `npx tsc --noEmit` | PASS |
| Integridad del diff | `git diff --check HEAD~1 HEAD` | PASS |

## Verificación de GitHub

El job Validate falló en el paso Lint con `e2e/qa-remediation-413-three-docs.spec.ts 8:72 Parsing error: ',' expected`. Localmente ese error ya no aparece. El resultado de CI se comprobará tras el push a `development`.

## Verificación visual

No aplica: solo cambia un spec e2e; no modifica interfaz ni comportamiento de la aplicación.

## Promoción

No solicitada. Este cambio se envía únicamente a `origin/development`.
