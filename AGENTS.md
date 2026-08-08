<!-- ANCLORA-ECOSYSTEM-CONTEXT-START -->
## Contexto de ecosistema Anclora

`anclora-talent` es una app premium del ecosistema Anclora para creación, edición, composición, previsualización y exportación de proyectos editoriales. El producto está en pausa; la gobernanza sigue vigente.

### Arranque de agente (bootstrap)

1. **Este archivo (`AGENTS.md`)** — reglas locales del repo.
2. **`.anclora/AOS_ADOPTION.md`** — declaración de adopción AOS v0.2.0 y excepciones activas.
3. **Fuentes delegadas, solo según el dominio de la tarea** (no leer todo por defecto):
   - Contratos, branding, design tokens normativos, repository registry, compliance: Bóveda Anclora (Operational Registry delegado) → `../boveda-anclora/contracts/`, p. ej. `../boveda-anclora/contracts/core/ANCLORA_ECOSYSTEM_ARCHITECTURE_CONTRACT.md`. Registry de contratos: `../boveda-anclora/contracts/governance/contracts-registry.json`.
   - Gobernanza constitucional y meta-gobierno: AOS → `../anclora-knowledge/` (índices enlazados desde `.anclora/AOS_ADOPTION.md`).
4. **Fuentes locales** — autoridad ejecutable por defecto en producto e ingeniería: `sdd/` (SDD vigente), `.agent/rules/`, `MEMORY.md`, `.anclora/AGENT_PROJECT_CONTEXT.md`.
5. **Conflictos entre fuentes**: resolución domain-first — clasificar por dominio → autoridad canónica vía registry → excepción activa si existe → supersession/fuente vigente o escalar. El histórico nunca gana.
6. **Decisiones**: clasificar por alcance — ED → AOS `MASTER_DECISIONS`; OD → Bóveda (mecanismo CHG); PD → locales (`sdd/`); EX → `.anclora/AOS_ADOPTION.md`.

No asumir infraestructura compartida entre productos. Validar siempre hosting, backend, base de datos, auth, variables y ramas.
<!-- ANCLORA-ECOSYSTEM-CONTEXT-END -->

<!-- ANCLORA-SDD-STANDARDS-START -->
## Metodología SDD — Estándar Unificado Anclora

Todo desarrollo en este repo sigue la metodología SDD unificada del ecosistema Anclora.

**Sistema SDD vigente de este repo**: `sdd/` — specs, planes y tasks por feature en `sdd/features/`. Es la autoridad local de producto e ingeniería. El material de `docs/superpowers/` (abril 2026) es **histórico**: specs/planes cerrados de una metodología anterior, conservados solo como registro; no es normativo y no debe usarse como base de trabajo nueva.

### Flujo de trabajo Git

- Rama base de desarrollo: **`development`**
- Los agentes crean ramas desde `development`: `feat/<agente>-<descripcion>`, `fix/...`, `chore/...`
- Las ramas se mergean de vuelta a `development` via PR
- Promoción manual: `development → staging → production → main`
- Nunca commitear directamente en `main`, `staging` ni `production`

### Principios de desarrollo (Specboot)

1. **Small Tasks, One at a Time** — baby steps, nunca saltarse pasos
2. **Test-Driven Development** — escribir tests fallidos antes de implementar
3. **Type Safety** — código completamente tipado (TypeScript)
4. **Clear Naming** — variables y funciones descriptivas
5. **English Only** — código, comentarios y docs técnicos en inglés
6. **90% Test Coverage** — cobertura exhaustiva en todas las capas
7. **Incremental Changes** — modificaciones focalizadas y revisables

### Ciclo de cambios (SDD en este repo)

Toda feature o fix sigue este flujo antes de escribir código:

- Crear spec: `sdd/features/<nombre>/<nombre>-spec-v1.md`
- Crear plan: `sdd/features/<nombre>/<nombre>-plan-v1.md` (cambios complejos)
- Crear tasks: `sdd/features/<nombre>/<nombre>-tasks-v1.md`
- Implementar tarea a tarea (tests primero)
- Validar contra criterios de aceptación de la spec
- PR contra `development`, con referencia a la spec

### Reglas obligatorias

- **No spec, no code**: toda feature empieza con spec en `sdd/features/`
- **Tests primero**: el agente ejecuta los tests, nunca el usuario
- **Hermes gate**: derogado — el mecanismo nunca se implementó en este repo; la revisión de copy público es responsabilidad del reviewer humano.
- **Spec inmutable**: una spec cerrada no se edita; los cambios generan una spec nueva
<!-- ANCLORA-SDD-STANDARDS-END -->
