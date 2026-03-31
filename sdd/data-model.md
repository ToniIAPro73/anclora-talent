# Data Model

## Core entities

### Project

- `id`
- `title`
- `slug`
- `status`
- `createdAt`
- `updatedAt`
- `themeId`
- `coverId`
- `documentId`

### Document

- `id`
- `projectId`
- `title`
- `subtitle`
- `language`
- `authors[]`
- `chapters[]`
- `assets[]`
- `metadata`

### Chapter

- `id`
- `title`
- `order`
- `blocks[]`

### Block

- `id`
- `type`
- `order`
- `content`
- `style`
- `assetRef`

Initial block types:

- `heading`
- `paragraph`
- `image`
- `quote`
- `divider`

### Asset

- `id`
- `projectId`
- `kind`
- `source`
- `alt`
- `width`
- `height`
- `usage`

### Cover

- `id`
- `projectId`
- `template`
- `background`
- `layers[]`
- `thumbnail`

### ExportJob

- `id`
- `projectId`
- `format`
- `status`
- `requestedAt`
- `completedAt`
- `artifactUrl`

## Data model rules

- Block order is explicit and stable.
- Images are assets referenced by blocks, not embedded ad hoc strings.
- Preview reads from `Document`.
- Export consumes the same `Document` plus selected theme and cover data.
- Importers are responsible for mapping raw file content into this model.
