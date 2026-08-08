# AOS Adoption Declaration

Declaración de adopción AOS para `anclora-talent`.

## Metadatos

- Repository Name: anclora-talent
- Repository Owner: AOS Chief Architect
- Adoption Status: Adopted With Exceptions
- AOS Version: v0.2.0
- Adoption Date: 2026-08-08
- Last Reviewed: 2026-08-08
- Governance Level: GL-1

## Propósito del repositorio

`anclora-talent` es una aplicación premium del ecosistema Anclora para creación, edición, composición, previsualización y exportación de proyectos editoriales.

El repositorio está actualmente en pausa desde 2026-08, pero conserva arquitectura, documentación, workflows, estándares locales y memoria técnica que deben quedar subordinados al AOS.

## Fuentes AOS referenciadas

Enlaza las fuentes oficiales AOS que gobiernan este repositorio:

- Constitution: [`../../anclora-knowledge/constitution/README.md`](../../anclora-knowledge/constitution/README.md)
- MASTER_DECISIONS: [`../../anclora-knowledge/knowledge/MASTER_DECISIONS.md`](../../anclora-knowledge/knowledge/MASTER_DECISIONS.md)
- CURRENT_STATE: [`../../anclora-knowledge/knowledge/CURRENT_STATE.md`](../../anclora-knowledge/knowledge/CURRENT_STATE.md)
- SOURCE_OF_TRUTH_REGISTRY: [`../../anclora-knowledge/knowledge/SOURCE_OF_TRUTH_REGISTRY.md`](../../anclora-knowledge/knowledge/SOURCE_OF_TRUTH_REGISTRY.md)
- Standards: [`../../anclora-knowledge/standards/README.md`](../../anclora-knowledge/standards/README.md)
- Playbooks: [`../../anclora-knowledge/playbooks/README.md`](../../anclora-knowledge/playbooks/README.md)
- Templates: [`../../anclora-knowledge/templates/README.md`](../../anclora-knowledge/templates/README.md)

## Fuentes oficiales locales

Declara qué conocimiento mantiene este repositorio como fuente oficial local.

| Tipo de conocimiento | Ruta local | Owner | Relación con AOS |
| --- | --- | --- | --- |
| Identidad y estado del producto | [`../README.md`](../README.md) | AOS Chief Architect | Fuente local subordinada a AOS. |
| Traducción del README | [`../README.en.md`](../README.en.md) | AOS Chief Architect | Traducción subordinada a `README.md`. |
| Contexto de agente del repositorio | [`AGENT_PROJECT_CONTEXT.md`](AGENT_PROJECT_CONTEXT.md) | AOS Chief Architect | Fuente local subordinada al protocolo AOS de agentes. |
| Reglas locales de agentes | [`../AGENTS.md`](../AGENTS.md) | AOS Chief Architect | Fuente local subordinada a AOS; contiene referencias legacy. |
| Memoria técnica local | [`../MEMORY.md`](../MEMORY.md) | AOS Chief Architect | Fuente local histórica/subordinada; contiene referencias legacy. |
| Producto | [`../sdd/product.md`](../sdd/product.md) | AOS Chief Architect | Fuente local de alcance de producto. |
| Arquitectura local | [`../sdd/architecture.md`](../sdd/architecture.md) | AOS Chief Architect | Fuente local de arquitectura de aplicación. |
| Modelo de datos local | [`../sdd/data-model.md`](../sdd/data-model.md) | AOS Chief Architect | Fuente local de modelo de datos. |
| Roadmap local | [`../sdd/roadmap.md`](../sdd/roadmap.md) | AOS Chief Architect | Roadmap de producto subordinado al roadmap AOS. |
| Motor de composición | [`../sdd/composition-engine.md`](../sdd/composition-engine.md) | AOS Chief Architect | Fuente local de arquitectura del motor de composición. |
| Features y decisiones locales de producto | [`../sdd/features/`](../sdd/features/) | AOS Chief Architect | Registros locales subordinados; no sustituyen decisiones AOS. |
| Integración FileStudio | [`../sdd/integrations/filestudio/`](../sdd/integrations/filestudio/) | AOS Chief Architect | Fuente local de integración; decisiones transversales deben elevarse a AOS. |
| Estándar visual propio de Talent | [`../docs/standards/TALENT_COLOR_PALETTE.md`](../docs/standards/TALENT_COLOR_PALETTE.md) | AOS Chief Architect | Fuente local específica de Talent, subordinada a AOS. |
| Workflows CI/promoción | [`../.github/workflows/`](../.github/workflows/) | AOS Chief Architect | Fuente local de operación GitHub; no define gobierno AOS. |
| Credenciales de prueba | [`../memory/test_credentials.md`](../memory/test_credentials.md) | AOS Chief Architect | Documento local de pruebas; contiene credenciales fake/test-only y debe permanecer tratado como sensitive-adjacent. |
| Package metadata | [`../package.json`](../package.json) | AOS Chief Architect | Fuente técnica local para scripts, dependencias y versión de paquete. |

## Política de decisiones locales

Las decisiones locales de `anclora-talent` viven actualmente en specs, planes, reviews y memoria técnica bajo:

- [`../sdd/features/`](../sdd/features/)
- [`../sdd/integrations/`](../sdd/integrations/)
- [`../MEMORY.md`](../MEMORY.md)
- [`../Archive/docs/`](../Archive/docs/)

Estas decisiones son subordinadas a AOS.

Una decisión local debe elevarse a AOS cuando:

- afecta a más de un repositorio;
- redefine una fuente oficial;
- modifica criterios de agentes, estándares, playbooks, prompts, templates, automation o aplicaciones;
- contradice o tensiona una decisión activa AOS;
- depende de una futura fuente central como Anclora Vault.

## Excepciones y desviaciones

Declara excepciones conocidas.

| ID | Descripción | Motivo | Riesgo | Owner | Fecha de revisión | Resolución |
| --- | --- | --- | --- | --- | --- | --- |
| EX-TALENT-001 | Referencias legacy a `Boveda-Anclora` como fuente canónica en `README.md`, `README.en.md`, `.anclora/AGENT_PROJECT_CONTEXT.md`, `AGENTS.md` y `MEMORY.md`. | AOS v0.2.0 fue creado después de esa gobernanza legacy. | Autoridad ambigua entre AOS y Bóveda. | AOS Chief Architect | 2026-08-08 | Mantener como excepción temporal; reemplazar por referencias AOS o futura Anclora Vault cuando se autorice cleanup. |
| EX-TALENT-002 | Contratos de ecosistema copiados en `docs/standards/`. | Talent conserva copias operativas de contratos de marca, UI, modal, cookies y localización. | Duplicación de fuentes oficiales y drift documental. | AOS Chief Architect | 2026-08-08 | Tratar como copias operativas subordinadas; futura resolución mediante Anclora Vault/AOS source registry. |
| EX-TALENT-003 | `AGENTS.md` define workflow local y referencias a guías externas legacy. | Preexiste al protocolo AOS de agentes. | Agentes pueden seguir reglas locales antes que AOS. | AOS Chief Architect | 2026-08-08 | Declarar subordinación a AOS; cleanup posterior si se autoriza. |
| EX-TALENT-004 | `.agent/skills/anclorabot-multiagente-system/SKILL.md` describe `anclora-synergi`, no Talent. | Artefacto local heredado o mal ubicado. | Confusión de agente/proyecto y falsa capacidad Skill. | AOS Chief Architect | 2026-08-08 | Mantener sin uso; revisar en cleanup posterior. No implementar Skills. |
| EX-TALENT-005 | `memory/test_credentials.md` contiene credenciales fake/test-only y placeholders OAuth. | Necesario para E2E y documentado como no real. | Riesgo de tratamiento incorrecto como secreto real o exposición sensible. | AOS Chief Architect | 2026-08-08 | Mantener como sensitive-adjacent; no publicar fuera de canales internos. |
| EX-TALENT-006 | Working tree contiene `pnpm-lock.yaml` y `pnpm-workspace.yaml` untracked. | Estado Git preexistente no relacionado con adopción. | Mezclar adopción con cambios de package manager/dependencias. | AOS Chief Architect | 2026-08-08 | No incluir en adopción; resolver por tarea separada. |

## Política de upgrade AOS

`anclora-talent` revisará nuevas versiones de AOS cuando:

- AOS publique una nueva release;
- cambien Constitución, decisiones, registro de fuentes oficiales o estándares aplicables;
- se reactive el producto;
- se modifiquen agentes, workflows, arquitectura local, integraciones o documentación de gobierno.

El upgrade debe:

1. Revisar release notes de AOS.
2. Revisar decisiones AOS nuevas o modificadas.
3. Actualizar `AOS Version` si adopta la nueva versión.
4. Registrar excepciones si no puede actualizar.
5. Elevar conflictos a AOS si afectan a más de un repositorio.

## Historial de adopción

| Fecha | AOS Version | Cambio | Owner |
| --- | --- | --- | --- |
| 2026-08-08 | v0.2.0 | Declaración inicial de adopción retrospectiva con excepciones. | AOS Chief Architect |

## Documentos relacionados

- [`../README.md`](../README.md)
- [`../AGENTS.md`](../AGENTS.md)
- [`../MEMORY.md`](../MEMORY.md)
- [`../sdd/architecture.md`](../sdd/architecture.md)
- [`../sdd/product.md`](../sdd/product.md)
- [`../sdd/roadmap.md`](../sdd/roadmap.md)
- [`../docs/standards/TALENT_COLOR_PALETTE.md`](../docs/standards/TALENT_COLOR_PALETTE.md)
