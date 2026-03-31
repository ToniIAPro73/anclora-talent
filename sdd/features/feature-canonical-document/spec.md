# Feature: Canonical Document

## Objetivo

Implementar el cambio prioritario del MVP: un documento editorial canonico y un repositorio local
compartido por dashboard, editor y preview.

## Archivos previstos

- Crear `src/domain/document/types.ts`
- Crear `src/domain/document/mockProject.ts`
- Crear `src/domain/document/store.tsx`
- Crear `src/domain/document/store.test.tsx`
- Modificar `src/App.tsx`
- Modificar `src/features/dashboard/DashboardScreen.tsx`
- Modificar `src/features/upload/UploadScreen.tsx`
- Modificar `src/features/editor/EditorScreen.tsx`
- Modificar `src/features/preview/PreviewScreen.tsx`

## Dependencias

- `feature-audit-roadmap`

## Riesgos

- El store podria crecer demasiado si mezcla dominio y presentacion.
- El editor puede degradarse si se intenta resolver toda la UX en una sola iteracion.
- El preview puede quedar desacoplado si no consume el mismo contrato tipado.

## Criterio de salida

- Existe un modelo tipado para proyecto, documento, capitulos, bloques y assets.
- Editor y preview leen del mismo estado.
- Una edicion en editor se refleja en preview sin duplicar representaciones.
- La funcionalidad queda protegida con tests.
