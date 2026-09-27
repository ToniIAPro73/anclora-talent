# SDD Spec: Markdown Import Modes (v1)

**Feature**: source-semantic versus materialized Markdown import
**Status**: IMPLEMENTED ON `development`; PROMOTION DISABLED

## Contract

Markdown is parsed once into the canonical source AST. The source owns
content, semantics and provenance, but no rich typography or page geometry.

`source-semantic` is the default and recommended mode. It preserves the
Markdown semantics and uses the Anclora Talent default presentation.

`materialized` preserves the same semantic AST and applies the centrally
defined Talent editorial profile. Its presentation provenance is
`TALENT_MATERIALIZED`; it is never reported as source typography.

Both modes persist the selected mode, source model and presentation
provenance in the import seed/project metadata. Existing DOC/DOCX/ODT/TXT
and disabled PDF/Brand contracts remain unchanged.

## Acceptance

- The mode chooser appears only for Markdown and defaults to
  `source-semantic`.
- Normal editor output contains rendered semantic blocks, not raw Markdown
  delimiters.
- Mode A and Mode B have equal semantic content; only presentation differs.
- Source-aware document data distinguishes source presentation from current
  presentation and materialized provenance.
- The real `ANCLORA_TALENT_TEST_MANUSCRIPT.md` fixture preserves headings,
  lists, table data, links, quotes and footnotes without turning its TOC links
  into duplicate chapters.
