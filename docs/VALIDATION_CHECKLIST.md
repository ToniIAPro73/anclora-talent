# Checklist de validación — Workspace v2 y manual de usuario (2026-10-19)

**Repositorio:** anclora-talent
**Rama y commit:** development @ b0a9d32a0ee4a93a4568bb2a138c2ff918317459
**Entorno de validación:** revisión documental del commit; aplicación no abierta en esta ejecución
**Datos:** sintéticos según `docs/manual/MANUAL_CHANGELOG.md`; capturas QA persistentes declaradas allí, sin cuenta personal

## 1. Qué cambia
- Completa claves de i18n ES/EN, deep links `?step=1..8` y `?documentData=open`, y etiquetas de baja resolución localizadas.
- Actualiza el manual v2, sus capturas y el PDF generado.

## 2. Ya comprobado por el agente
| Comprobación | Comando o método | Resultado | SHA |
| --- | --- | --- | --- |
| Gates de unit tests y ESLint | Evidencia registrada en `sdd/features/workspace-system-v1-closure/workspace-system-v1-closure-tasks-v1.md`; los logs originales no forman parte de este commit | PASS documentado; no repetido en esta ejecución | b0a9d32a0ee4a93a4568bb2a138c2ff918317459 |
| Manual gate y artefactos PDF/capturas | `docs/manual/MANUAL_CHANGELOG.md` (MANUAL_GATE PASS; 13 CURRENT, 1 STATIC, 0 STALE) | PASS documentado | b0a9d32a0ee4a93a4568bb2a138c2ff918317459 |
| Integridad del diff | `git diff --check origin/development...HEAD` | PASS | b0a9d32a0ee4a93a4568bb2a138c2ff918317459 |

## 3. Pruebas no ejecutadas (NOT_RUN)
| Prueba | Motivo concreto |
| --- | --- |
| Reejecución de Vitest, ESLint y generación/verificación visual del PDF | El commit contiene evidencia documental de ejecución previa; no se reejecutan validaciones ya registradas para atender el bloqueo del hook. |
| Revisión visual en la aplicación | No se abrió la aplicación en esta ejecución. El commit declara capturas sintéticas verificadas; la inspección visual actual queda pendiente. |

## 4. Checklist para validar en la aplicación
| # | Dónde | Pasos | Resultado esperado | Cuenta o configuración | Bloqueante |
| --- | --- | --- | --- | --- | --- |
| 1 | `/projects/new` | Cambiar idioma ES/EN y revisar los cuatro bloques y el resumen sticky | Todos los textos aparecen en el idioma seleccionado | Identidad QA dedicada del contrato; datos QA existentes | Sí |
| 2 | `/projects/<id>/editor?step=3` y `?step=8` | Abrir enlaces directos a Portada y Exportar | El workspace abre el paso solicitado | Proyecto QA existente | Sí |
| 3 | `/projects/<id>/editor?documentData=open` | Abrir el enlace con el parámetro | Se abre el modal Datos del documento | Proyecto QA existente | Sí |
| 4 | `/projects/<id>/preview` | Usar el enlace de exportación | Navega a `/editor?step=8` | Proyecto QA existente | Sí |
| 5 | `/projects/<id>/editor?step=3` | Revisar advertencias con imagen de baja resolución en ES y EN | Advertencias localizadas y comprensibles | Proyecto QA con imagen de prueba | Sí |

### Casos negativos y de borde
| # | Caso | Resultado esperado |
| --- | --- | --- |
| 1 | `?step` fuera de 1..8 o inválido | No rompe el workspace; mantiene un paso válido |
| 2 | Montaje/desmontaje rápido del workspace durante guardado | No ejecuta callbacks de UI tras desmontar |

### Estados de interfaz afectados
- [ ] Vacío · [x] Cargando · [x] Error · [x] Éxito · [x] Móvil · [x] Escritorio · [x] Modo oscuro

## 5. Riesgos y limitaciones
- Los resultados de tests, ESLint y MANUAL_GATE están documentados en los artefactos del commit, pero sus logs no están adjuntos aquí.
- La revisión de aplicación para estos cambios queda pendiente; usar solo la identidad QA dedicada y datos existentes del contrato.

## 6. Decisión de Toni
- [ ] Todos los puntos bloqueantes pasan
- [ ] Se promociona: escribir `PROMOTE=FULL` (staging → production → main)
- [ ] No se promociona. Motivo: ______________________
