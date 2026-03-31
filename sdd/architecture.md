# Architecture

## Frontend

The frontend is a React application organized by feature area:

- `app/`: application shell, navigation, global types.
- `features/upload`: import workflow and source intake.
- `features/editor`: document editor and block operations.
- `features/cover`: cover studio.
- `features/preview`: real preview and export controls.
- `features/strategy`: delivery and roadmap surfaces.
- `shared/ui`: reusable layout and interface primitives.

## Backend direction

The backend should be introduced once the frontend flow is ready for real data. It will own:

- document import and parsing
- asset persistence
- export jobs
- document version storage
- AI-assisted transformations

The import/export pipeline should not live only in the browser.

## Core architectural rule

There must be one canonical document model used by:

- the import pipeline
- the editor
- the preview renderer
- the export pipeline

No feature may define a competing content representation without an explicit mapping layer.

## Integration order

1. Frontend shell and feature boundaries.
2. Canonical document model.
3. Local mock repository for project state.
4. Real import adapters.
5. Real export services.
6. AI enhancement layer.

## Technical priorities

- Keep each feature isolated.
- Avoid reintroducing monolithic UI files.
- Prefer typed contracts over implicit object shapes.
- Preserve a clean build and typecheck after every phase.
