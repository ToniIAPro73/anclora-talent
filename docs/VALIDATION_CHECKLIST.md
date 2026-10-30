# Checklist de validación — Talent como repositorio activo (2026-10-30)

> Se sobrescribe en cada entrega; el historial queda en Git.

**Repositorio:** anclora-talent
**Rama:** development
**Datos:** no se usaron ni modificaron datos de aplicación.

## 1. Qué cambia
- `README.md`: la categoría y el estado dejan de indicar "pausado" y pasan a "Activo" (decisión de Toni, 2026-10-30).
- Cinco copias de contratos en `docs/standards/` se refrescan desde Vault (retiran la marca "pausado" de Talent).
- Sin cambios de código, dependencias ni despliegue.

## 2. Ya comprobado por el agente
| Comprobación | Resultado |
| --- | --- |
| Copias idénticas a las de Vault; `aos-adopt inspect` sin deriva; `git diff --check` | PASS |

## 3. NOT_RUN
Tests, lint, build y E2E de la aplicación: el diff es solo documentación. El CI de este repositorio ya fallaba antes (`testid-coverage-contract` en `AdvancedCoverEditor.tsx:961` y `dashboard-light-contract`); no se ha tocado.

## 4. Para Toni
Sin pasos manuales. Bloqueante: no.
