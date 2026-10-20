# Checklist de validación — CI de Anclora Talent

**Repositorio:** anclora-talent
**Rama y commit validado:** `development` @ `2c18944`
**Alcance:** corregir el mock de `deleteProjectAction` y una expresión de contraseña QA inválida en un test E2E.

## Comprobaciones ejecutadas

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Test de borrado | `npm run test:run -- src/lib/projects/delete-action.test.ts` | PASS — 1 archivo, 1 test; verifica carga, borrado, limpieza de blobs y redirección. |
| Lint | `npm run lint` | PASS |
| Typecheck | `npx tsc --noEmit` | PASS |
| Build | `npm run build` | PASS |
| Diff | `git diff --check` | PASS |
| Suite completa local | `npm run test:run` | 1.964 pasaron, 7 expiraron por el timeout de 5 s en pruebas de estructura, importación/exportación y estilos. El test de borrado pasó. |

## Incidencias de CI y resolución

- CI `39334649460`: el mock de repositorio omitía `getProjectById`; corregido y cubierto por el test de borrado.
- CI `39355310918`: ESLint encontró sintaxis inválida en `e2e/qa-remediation-413-three-docs.spec.ts:8`; la contraseña ahora se lee desde `process.env.E2E_AUTH_PASSWORD`.
- Ambos commits están en `development`. La nueva ejecución de GitHub Actions se verificará después del push.

## Verificación visual y promoción

La revisión visual no aplica: son cambios de tests, sin cambios en UI ni en el runtime de la aplicación. No se solicitó promoción; destino único: `origin/development`.
