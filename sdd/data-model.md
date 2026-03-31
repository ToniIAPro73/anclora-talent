# Data Model

## Active entities

### AppUser

- `id`
- `clerkUserId`
- `email`
- `createdAt`
- `updatedAt`

### Project

- `id`
- `userId`
- `workspaceId`
- `slug`
- `title`
- `status`
- `createdAt`
- `updatedAt`

### ProjectDocument

- `id`
- `projectId`
- `title`
- `subtitle`
- `language`

### DocumentBlock

- `id`
- `projectDocumentId`
- `chapterId`
- `chapterOrder`
- `chapterTitle`
- `blockOrder`
- `blockType`
- `content`

Active block types:

- `heading`
- `paragraph`
- `quote`

### ProjectAsset

- `id`
- `projectId`
- `workspaceId`
- `kind`
- `blobUrl`
- `alt`
- `usage`

### CoverDesign

- `id`
- `projectId`
- `title`
- `subtitle`
- `palette`
- `backgroundImageUrl`
- `thumbnailUrl`

### CoverLayer

- `id`
- `coverDesignId`
- `layerOrder`
- `kind`
- `payload`

### DesignTemplate

- `id`
- `templateKey`
- `name`
- `description`
- `previewUrl`
- `defaults`

### ExportJob

- `id`
- `projectId`
- `format`
- `status`
- `artifactUrl`
- `requestedAt`
- `completedAt`

### ActivityLog

- `id`
- `userId`
- `projectId`
- `eventType`
- `payload`
- `createdAt`

## Data model rules

- `workspaceId` stays nullable until collaborative workspaces become active.
- Document block order is explicit and stable.
- Preview reads from the same persisted document structure as the editor.
- Cover data is independent from document blocks, but linked to the same project.
- Binary files live in Blob; Postgres stores metadata and references.
