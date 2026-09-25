# SDD Spec: Source Document Fidelity & True Pagination Baseline (v1)

**Feature**: Source Document Fidelity, Explicit Overrides, and True Pagination Baseline
**Status**: DRAFT -> IN REVIEW -> APPROVED
**Target Branch**: `development`
**Authority Level**: CANONICAL LOCAL FEATURE SPEC

---

## 1. Problem Statement & Motivation

Previously, when a manuscript DOCX was imported into Anclora Talent:
1. Composition resolution merged extracted properties directly into `project.document.metadata.composition` without provenance.
2. If a user edited a single setting, the entire set of defaults was saved as a project override, obliterating the original source value.
3. Active brand profiles were automatically and silently assigned to newly imported projects via `resolveBrandProfileId()`.
4. Style engine cascade (`cascade-resolver.ts`) fell back to generic `SYSTEM_DEFAULTS` (Georgia, 11pt, left-aligned) rather than respecting the manuscript's typography, page geometry, alignment (such as justified text), margins, and heading styles.
5. Chapter Editor and Preview lacked direct wiring of source justification and style properties from the compiled document.
6. Page boundaries lacked a durable baseline with provenance and content-hash validity checks.

---

## 2. Core Architectural Invariants

### 2.1 The 5-Layer Style Hierarchy
The effective style of any document property must resolve through a deterministic 5-layer cascade:

1. **User Overrides** (`UserStyleOverride[]`): Explicit local/manual user changes (highest priority).
2. **Explicit Reference Profile** (`ReferenceEditorialProfile`): Explicitly applied reference document layout/typography.
3. **Explicit Brand Profile** (`BrandProfile`): Explicitly applied brand colors and typography.
4. **Original Source Style Profile** (`OriginalDocumentStyleProfile`): Typography, alignment, margins, and geometry extracted from the imported manuscript.
5. **Talent Fallbacks** (`SYSTEM_DEFAULTS`): Used ONLY when none of the higher layers provides the property.

### 2.2 Provenance Separation
- `OriginalDocumentStyleProfile` is persisted in `project.document.metadata.originalDocumentStyleProfile`. It is immutable upon user edits.
- `userOverrides` only contains keys explicitly touched by the user.
- Resetting an override removes that key, immediately restoring the original source profile value.

### 2.3 Brand & Reference Explicitness
- Freshly imported projects start with `brandProfileId: null`, `brandChoice: 'none'`, and `referenceEditorialProfile: null`.
- No global or active brand profile is silently bound.

---

## 3. Data Models

### 3.1 `OriginalDocumentStyleProfile`
```typescript
export interface OriginalDocumentStyleProfile {
  version: 1;
  sourceAssetId?: string;
  sourceHash?: string;
  parserVersion: string;
  extractedAt: string;

  page: {
    widthPt?: number;
    heightPt?: number;
    orientation?: 'portrait' | 'landscape';
    marginsPt?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    gutterPt?: number;
  };

  body: {
    fontFamily?: string;
    fontSizePt?: number;
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    fontStyle?: 'normal' | 'italic';
    color?: string;
    lineHeight?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    firstLineIndentPt?: number;
    leftIndentPt?: number;
    rightIndentPt?: number;
    spacingBeforePt?: number;
    spacingAfterPt?: number;
  };

  headings?: {
    h1?: Partial<ResolvedTextStyle>;
    h2?: Partial<ResolvedTextStyle>;
    h3?: Partial<ResolvedTextStyle>;
    h4?: Partial<ResolvedTextStyle>;
  };

  provenance: Record<string, {
    source: 'docx-styles' | 'docx-direct' | 'docx-defaults' | 'fallback';
    confidence: number;
    rawOoxmlValue?: string;
  }>;
}
```

### 3.2 `SourcePaginationBaseline`
```typescript
export interface SourcePaginationBaseline {
  version: 1;
  sourceHash: string;
  canonicalContentHash: string;
  pageCount: number;
  exactness: 'proven_ooxml_breaks' | 'estimated_source_geometry';
  pages: Array<{
    pageNumber: number;
    startAnchor: { blockIndex: number; offset: number };
    endAnchor: { blockIndex: number; offset: number };
  }>;
  createdAt: string;
}
```

---

## 4. Technical Spike: Source Pagination Exactness

- **Method A (Direct OOXML)**: Extracts manual page breaks (`<w:br w:type="page"/>`), section breaks (`<w:sectPr/>`), and `<w:lastRenderedPageBreak/>`. When last rendered page break tags are present in OOXML, exact page boundaries are mapped to semantic block anchors.
- **Method B (Headless Renderers)**: Evaluated LibreOffice/soffice. Blocker: Neither LibreOffice nor custom serverless binary execution is supported in the Vercel serverless production runtime.
- **Verdict on Soft Page Breaks without OOXML Markers**: When a DOCX lacks `<w:lastRenderedPageBreak/>`, exact soft page boundaries cannot be guaranteed without a matching rendering engine. The system records `exactness: 'estimated_source_geometry'` and `SOURCE_PAGINATION_EXACTNESS = NOT_PROVEN` for unanchored soft breaks, while preserving 100% exact manual and section break boundaries.

---

## 5. Acceptance Criteria

1. **AC-01 (Source Extraction)**: Full typography (family, size, weight, line-height, text-align, indents, margins, page geometry, headings) extracted from OOXML and normalized in points (`pt`).
2. **AC-02 (Brand Isolation)**: Fresh DOCX import results in `brandProfileId = null` and no brand styling applied.
3. **AC-03 (Reference Isolation)**: Fresh DOCX import results in `referenceEditorialProfile = null`.
4. **AC-04 (Separate Overrides)**: Editing a property in DocumentDataModal only creates an override for that specific field.
5. **AC-05 (Reset Fidelity)**: Resetting an override restores the original source profile value.
6. **AC-06 (Editor & Preview Alignment)**: Chapter Editor and Preview render the compiled document using the exact source typography, justification, and margins.
7. **AC-07 (Quality Gates)**: TypeScript, Vitest, lint, and build all pass cleanly.
