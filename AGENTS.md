
> [!IMPORTANT]
> This repository is governed by the Anclora canonical contracts under `.anclora/`.
> Agent-specific defaults, personal presets, or global agent configurations must NOT override those contracts.
> Read `.anclora/AGENT_PROJECT_CONTEXT.md` before starting substantial work.


<!-- ANCLORA-ECOSYSTEM-CONTEXT-START -->
## Contexto de ecosistema Anclora (Bootstrap de agentes)

`anclora-talent` es una aplicación premium del ecosistema Anclora para creación, edición, composición, previsualización y exportación de proyectos editoriales.

Antes de realizar tareas sustanciales en este repositorio, el agente debe leer:
1. [`.anclora/AGENT_PROJECT_CONTEXT.md`](.anclora/AGENT_PROJECT_CONTEXT.md) (v1.0) y seguir su enrutamiento canónico hacia:
   - [`.anclora/PRODUCTION_RUNTIME.md`](.anclora/PRODUCTION_RUNTIME.md) para ejecución, infraestructura, base de datos, migraciones (`SCHEMA_PUSH`), QA y Git.
   - [`.anclora/AOS_ADOPTION.md`](.anclora/AOS_ADOPTION.md) para gobernanza, decisiones, excepciones y autoridad AOS.
   - Fuentes canónicas específicas según el dominio de la tarea (`sdd/`, etc.).

No asumir infraestructura compartida entre productos. Validar siempre hosting, backend, base de datos, auth, variables y ramas en `.anclora/PRODUCTION_RUNTIME.md`.
<!-- ANCLORA-ECOSYSTEM-CONTEXT-END -->

<!-- ANCLORA-SDD-STANDARDS-START -->
## Metodología SDD — Estándar Unificado Anclora

Todo desarrollo en este repo sigue la metodología SDD unificada del ecosistema Anclora.

**Sistema SDD vigente de este repo**: `sdd/` — specs, planes y tasks por feature en `sdd/features/`. Es la autoridad local de producto e ingeniería. El material de `docs/superpowers/` (abril 2026) es **histórico**: specs/planes cerrados de una metodología anterior, conservados solo como registro; no es normativo y no debe usarse como base de trabajo nueva.

### Flujo de trabajo Git

- Rama de trabajo normal: **`development`**; trabajar directamente en la rama existente.
- No crear ramas `feat/*`, `fix/*`, `chore/*`, worktrees ni PR para el trabajo normal, salvo instrucción explícita actual de Toni.
- Al iniciar, comprobar rama y estado. Si hay una rama distinta con cambios sin commit o commits propios, conservarla y detenerse antes de editar; informar y esperar indicaciones. Si está limpia y no tiene commits propios, cambiar a la rama existente `development`; nunca crearla como alternativa.
- Mantener los cambios sin commit hasta que Toni los valide en el entorno de desarrollo. Después, hacer un commit y push a `origin/development` según el contrato del workspace.
- Promoción manual: solo tras la revisión de Preview y la instrucción exacta `PROMOTE=FULL`, mediante `development → staging → production → main`.
- Nunca commitear directamente en `main`, `staging` ni `production`.

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
- Con la spec validada, presentar los cambios en el entorno `development` y esperar la validación expresa de Toni antes del commit/push; no crear un PR para el flujo normal.

### Reglas obligatorias

- **No spec, no code**: toda feature empieza con spec en `sdd/features/`
- **Tests primero**: el agente ejecuta los tests, nunca el usuario
- **Hermes gate**: derogado — el mecanismo nunca se implementó en este repo; la revisión de copy público es responsabilidad del reviewer humano.
- **Spec inmutable**: una spec cerrada no se edita; los cambios generan una spec nueva
<!-- ANCLORA-SDD-STANDARDS-END -->

<!-- ANCLORA-AOS:START -->
## AOS bootstrap

This repository follows AOS (`AUTHORITY=anclora-governance`). Resolve canonical Governance ([AOS Adoption Standard](../anclora-governance/standards/AOS_ADOPTION_STANDARD.md)) and this repository's runtime contract `.anclora/PRODUCTION_RUNTIME.md`. Use `.anclora/AGENT_PROJECT_CONTEXT.md` as the minimal task router and `.anclora/AOS_ADOPTION.md` for adoption and exceptions, loading each only as the task requires. Do not assume generic defaults when a contract exists.
<!-- ANCLORA-AOS:END -->
