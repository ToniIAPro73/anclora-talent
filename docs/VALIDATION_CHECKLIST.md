# Checklist de validación — test de borrado de proyecto

**Repositorio:** anclora-talent
**Rama y commit validado:** `development` @ `6ef8305`
**Alcance:** corregir el mock del test `deleteProjectAction`; la acción carga el proyecto antes de borrar la fila y limpia sus blobs asociados.

## Comprobaciones ejecutadas

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Test afectado | `npm run test:run -- src/lib/projects/delete-action.test.ts` | PASS — 1 archivo, 1 test |
| Typecheck | `npx tsc --noEmit` | PASS |
| Build | `npm run build` | PASS |
| Suite completa local | `npm run test:run` | 1.964 tests pasaron; 7 tests ajenos al borrado expiraron por el timeout de 5 s en pruebas de estructura, importación/exportación y estilos. El test de borrado pasó. |
| Integridad del diff | `git diff --check` | PASS |

## Verificación de GitHub

El workflow mostrado por Toni falló únicamente en `src/lib/projects/delete-action.test.ts` por no incluir `getProjectById` en el mock de `projectRepository`. La corrección local reproduce el test y pasa. El nuevo resultado de CI se comprobará después del push a `development`.

## Verificación visual

No aplica: el cambio solo actualiza un test unitario; no modifica interfaz ni comportamiento de la aplicación.

## Promoción

No solicitada. Este cambio se envía únicamente a `origin/development`.
