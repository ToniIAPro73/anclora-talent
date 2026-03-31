# Product Scope

## Vision

Anclora Studio is an editorial application for turning raw source documents into digital publishing products. The product must support import, editing, enrichment with images, cover creation, preview, and export to digital formats such as PDF and EPUB.

## Primary user value

The user should be able to start from an existing manuscript or rough source document and move through a single workflow:

1. Import source material.
2. Normalize content into a structured document.
3. Edit and enrich the content.
4. Design the cover and supporting visual assets.
5. Preview the final output.
6. Export a production-ready digital product.

## MVP scope

The first MVP will focus on the smallest vertical slice that proves the product:

- Create a project.
- Import `txt` and `docx`.
- Normalize content into a canonical document model.
- Edit chapters, paragraphs, quotes, and images.
- Manage a simple cover composition.
- Preview the document using real project content.
- Export to PDF.

## Out of scope for initial MVP

- Full-fidelity PDF-to-editable reconstruction.
- Collaborative real-time editing.
- Marketplace or distribution features.
- Advanced cover automation based on AI image generation.
- Broad export matrix beyond PDF and EPUB.

## Product principles

- The editor is structure-first, not markup-first.
- Preview and export must use the same source of truth.
- Import is progressive by format priority, not all-at-once.
- AI features are layered on top of a stable editorial core.
- The UX should feel premium but remain direct and fast.
