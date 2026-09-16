# Reference Editorial Profile v2

## Goal

Extract reusable visual and composition rules from reference documents. Apply those rules to the user's manuscript without copying source content or source structure.

## Non-goals

- Copy reference prose, chapter titles, literal headers, page numbers, or voice.
- Create reference chapter counts, front matter, or back matter in target manuscripts.
- Replace Cover Studio.
- Require LLM inference for deterministic layout facts.

## Canonical model

`ReferenceEditorialProfile` stores provenance, page geometry, typography, role styles, paragraph rhythm, repeated header/footer rules, TOC presentation, palette, per-category confidence, and optional anonymous structure observations. Legacy `StructureProfile` remains readable through an adapter.

## Ownership and cascade

Manuscript owns content and semantic structure. Profile owns style and composition. Application precedence:

1. explicit project override;
2. user-modified style;
3. reference editorial profile;
4. product template;
5. global defaults.

## Extraction

PDF extraction uses deterministic page text/layout evidence when available. It normalizes subset font names, clusters style signatures, detects body and heading roles, chapter-opening patterns, page geometry, repeated headers/footers, folio rules, TOC presentation, paragraph rhythm, quotes, lists, and a limited palette. Semantic structure stays optional and independent.

DOCX keeps existing support path where available. Plain text/Markdown report lack of visual evidence.

## Application

`applyReferenceEditorialProfile` updates composition rules for compatible manuscript roles. It preserves manuscript chapter count and headings, does not create missing semantic roles, and never overwrites manual overrides without explicit user choice.

## UX

Creation flow calls this feature Reference Editorial Profile in ES/EN. Style is primary. Observed Structure is secondary and explicitly marked as informational. Confirmation requires a non-empty quality profile; valid style extraction remains usable when semantic inference is empty.

## Security and provenance

Reference uploads require existing authentication, ownership, MIME and size validation. Stored profile retains source filename, asset id when available, hash, analysis timestamp, and parser version. No substantive source text is persisted.

## Acceptance

- Real PDF fixture yields non-empty geometry/body/heading evidence where parser permits.
- Normalized fonts distinguish detected from resolved fallback fonts.
- Style extraction survives semantic extraction failure.
- Applying a ten-chapter reference to a five-chapter manuscript yields five chapters.
- Reference prologue/epilogue never gets created in target.
- Target headings/content remain unchanged.
- Manual style override wins and persists.
- Existing legacy structure profiles remain readable.
