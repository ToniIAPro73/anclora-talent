# Checklist de validación — dev:docker y dev:vercel liberan el puerto antes de arrancar

**Alcance:** los scripts `dev:docker` y `dev:vercel` ejecutan primero la liberación de puerto de `anclora-infrastructure` (como ya hacía `dev`). Sus runtimes (`scripts/local-dev.mjs`, `scripts/qa/dev-runtime.mjs`) fijan el puerto 3000, que el registro no asigna a talent (3010), por eso se añade `local_alt_ports: "3000"` en el registro de infraestructura. No se cambia el puerto de la aplicación: `AUTH_APP_URL` y el resto del entorno local siguen en 3000.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `package.json` válido | PASS |
| `free-port.mjs --dry-run` en talent | Detecta el `next-server` colgado en el 3000 y lo liberaría |
| Tests de las herramientas (`anclora-infrastructure`) | PASS — 12 tests |

## Verificación visual

No aplica: solo scripts de arranque.

## Promoción

No solicitada en este cambio.
