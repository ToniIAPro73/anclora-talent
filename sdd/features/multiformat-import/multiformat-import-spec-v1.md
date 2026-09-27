# SDD Spec: Multi-format Source-aware Import (v1)

**Feature**: Multi-format import architecture and source-true document model
**Status**: IMPLEMENTED ON `development`; PROMOTION PENDING EXPLICIT APPROVAL
**Target Branch**: `development`

## Scope

Talent accepts DOC, DOCX, ODT, Markdown and TXT through explicit source
adapters. PDF remains implemented for legacy compatibility but is temporarily
disabled in the current import flow. Pages is reserved and not advertised.

## Invariants

1. Rich office sources preserve rich-source capabilities and provenance.
2. Markdown preserves semantic structure and inline marks without inventing
   source typography.
3. TXT preserves text and line boundaries; structural inference is conservative
   and marked as inferred.
4. Reference documents affect presentation only and never manuscript content.
5. User edits remain separate from source and inferred values.
6. The dispatcher is the single source of format acceptance and adapter choice.

## Canonical source contract

Every import seed may carry `sourceModel` with its source format, family,
capabilities, canonical blocks, metadata and property provenance. Existing
chapter/block fields remain as a backwards-compatible editor projection.

## Acceptance criteria

- DOC/DOCX/ODT are classified as rich; MD as semantic; TXT as plain text.
- PDF is rejected by the active import route and file picker with a clear
  unsupported-format result without deleting legacy PDF code.
- ODT is parsed from its OpenDocument package rather than as plain text.
- Markdown headings, lists, quotes, links, images and code fences remain
  semantic blocks; Markdown typography is not reported as source typography.
- TXT encoding and conservative inferred headings are represented explicitly.
- Existing DOCX import, project creation and persistence remain compatible.
