# Checklist de validación — arreglo del CI de development (2026-10-30)

> Se sobrescribe en cada entrega; el historial queda en Git.

**Repositorio:** anclora-talent
**Rama:** development
**Datos:** no se usaron ni modificaron datos de aplicación.

## 1. Qué cambia
- `AdvancedCoverEditor.tsx`: el botón de cerrar el diálogo de capas recibe `data-testid="advanced-editor-layers-dialog-close"` (contrato de cobertura de testids).
- `dashboard-light-contract.test.ts`: los tokens del botón primario del tema claro se alinean con `globals.css` (`#C7DFE1` / `#12384A`, definidos a propósito en el commit `512dc60`); el test se había quedado desfasado.
- Sin cambios de estilo, de lógica ni de dependencias.

## 2. Ya comprobado por el agente
| Comprobación | Resultado |
| --- | --- |
| `testid-coverage-contract` y `dashboard-light-contract` | PASS |
| Suite completa de vitest | 2031 PASS; 2 timeouts de 5 s por carga local (`extract-structure-profile.contract`, `projects/import/route`) que aislados pasan (14/14) |
| `eslint` de los ficheros tocados, `npm run build` | PASS |

## 3. NOT_RUN
| Prueba | Motivo |
| --- | --- |
| Gate de EPUB (EPUBCheck) | No hay Java Runtime real en este Mac; el paso corre en CI. |

## 4. Para Toni
Revisar que el CI de `development` queda en verde. Bloqueante: no.
