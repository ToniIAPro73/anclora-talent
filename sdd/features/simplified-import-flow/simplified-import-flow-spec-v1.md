# Simplified import flow — v1

## Scope

The canonical new-project flow accepts one manuscript (`.docx` or legacy `.doc`)
and an optional editorial reference (`.docx`). The manuscript is the only content
source. The reference contributes style evidence only; it must never create
chapters or blocks.

The effective style cascade for new unbranded projects is:

`explicit user overrides > reference editorial profile > manuscript source styles > product fallback`.

Existing explicit project brand bindings remain readable and are not migrated.
New projects do not inherit or create brand bindings while
`BRAND_IDENTITY_ENABLED=false`.

## Format contract

`.docx` is parsed with the existing OOXML-aware pipeline, preserving headings,
paragraph structure, tables and available style metadata. Legacy `.doc` is
normalized through the existing binary Word extractor available to the runtime;
the result is text-structure-only and is explicitly reported as a fidelity
limitation. A failed `.doc` normalization is a blocking, actionable error. The
system never renames a `.doc` to `.docx` and never reports an empty fake success.

The current Vercel runtime does not provide LibreOffice/soffice, so no runtime
conversion dependency is assumed. Higher-fidelity `.doc` conversion remains an
infrastructure follow-up.

## Brand capability

The Content > Marca tab stays discoverable and renders a disabled “Próximamente”
state. Existing brand data/code/schema are preserved. New upload, apply, status,
and new-project binding mutations are disabled by the canonical capability.
