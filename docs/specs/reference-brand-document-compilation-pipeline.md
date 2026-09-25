# ARCHITECTURAL SPECIFICATION
# ANCLORA TALENT — REFERENCE + BRAND DOCUMENT COMPILATION PIPELINE

- **Document ID**: `SPEC-TALENT-REF-BRAND-COMPILATION-V1`
- **Target Path**: `docs/specs/reference-brand-document-compilation-pipeline.md`
- **Status**: `SPEC_READY_FOR_REVIEW`
- **Authoring Baseline**: Git SHA `35ce26a2797fe61bf8fe28ac93d8dd6959cf4bfe` on branch `development`
- **Classification**: Local Canonical Product & Engineering Architecture Specification (`sdd/` aligned)
- **Governing Contracts**: [`.anclora/AGENT_PROJECT_CONTEXT.md`](../.anclora/AGENT_PROJECT_CONTEXT.md), [`.anclora/PRODUCTION_RUNTIME.md`](../.anclora/PRODUCTION_RUNTIME.md), [`.anclora/AOS_ADOPTION.md`](../.anclora/AOS_ADOPTION.md)

---

## 1. EXECUTIVE SUMMARY

Anclora Talent is an interactive editorial composition platform. While Talent accepts three primary source inputs—(1) a manuscript document (DOCX/Markdown), (2) an editorial reference document (DOCX/PDF), and (3) a brand identity manual (PDF)—the current pipeline fails to synthesize them into a unified, editable document.

Instead of a compiled result reflecting the reference typography, composition geometry, and brand identity, the Chapter Editor renders a generic document with hardcoded styling and defaults (e.g. `'Liberation Serif'`). Furthermore, the manuscript parser conflates Table of Contents (TOC) entries with body headings, polluting chapter titles with trailing TOC page numbers (e.g., `"Capítulo 1. El coste invisible del ruido 4"`).

This specification defines the **Reference + Brand Document Compilation Pipeline**: an end-to-end, deterministic, non-destructive architecture that resolves:
1. **Manuscript Content & Semantic Structure** (clean body text, headings, tables, lists, quotes, without TOC contamination);
2. **Editorial Style Profile** (page geometry, typographic scales, margins, leading, spacing, heading rules extracted from reference DOCX/PDF);
3. **Brand Profile** (semantic palette tokens, typographic pair, visual accents extracted from brand PDF);
4. **User Style Overrides** (explicit, granular editorial decisions with highest precedence);

into a single canonical **`CompiledDocument`** model. This compiled model feeds the **Chapters Screen**, **Chapter Editor**, **Preview Canvas/Modal**, and **Exports** (PDF, DOCX, EPUB, HTML) with complete visual and typographic fidelity.

---

## 2. PROBLEM STATEMENT & TEST CASE CONTEXT

### 2.1 The Symptom Pack
Testing with the canonical test pack:
- Manuscript: `ANCLORA_TALENT_TEST_MANUSCRIPT.docx` (with title, TOC, chapters, subheadings, tables, footnotes, headers, footers);
- Reference: `ANCLORA_TALENT_REFERENCE_STYLE.docx` (distinct editorial treatment, specific margins, typography, heading scale);
- Brand: `ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf` (palette tokens: ink, paper, accent, gold; typography pairs);

exposed the following system breakdowns:
1. **TOC Page Number Contamination**: TOC page references (e.g., `"3"`, `"4"`, `"6"`) become permanent suffixes of chapter titles (e.g., `"Introducción 3"`).
2. **TOC Text Ingestion as Chapters**: The TOC block is parsed as manuscript chapters rather than an anonymous structural index.
3. **Semantic Heading Flattening**: Word headings with localized styles (`"Título 1"`, `"Heading 1"`) degrade into unstyled paragraphs or uncalibrated heading levels.
4. **Reference Style Ignored**: The extracted `ReferenceEditorialProfile` is only partially applied to `CompositionSettings` (only `fontFamily` and `margins` if unset), leaving headings, colors, and line metrics unstyled.
5. **Brand Identity Disconnected**: `BrandProfile` exists as an isolated database entity and export override, but has zero effect on the Chapter Editor.
6. **Hardcoded Fallbacks in Editor**: `AdvancedRichTextEditor` hardcodes Tailwind classes (`text-base leading-7 [&_h1]:text-2xl [&_h1]:font-black`) and falls back to `'Liberation Serif'`.
7. **Destructive Coupling**: Changing a reference or brand file risks re-importing prose and obliterating manual edits.

### 2.2 Core Objective
Establish a clean, unidirectional, deterministic pipeline:
```text
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  Manuscript Importer   │      │ Reference Style Engine │      │   Brand Profile Store  │      │  User Style Overrides  │
│  (Pure Content AST)    │      │ (EditorialStyleProfile)│      │  (Semantic Tokens)     │      │  (Granular Overrides)  │
└───────────┬────────────┘      └───────────┬────────────┘      └───────────┬────────────┘      └───────────┬────────────┘
            │                               │                               │                               │
            └───────────────────────┬───────┴───────────────────────────────┴───────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Style Cascade     │
                         │    & Resolver       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Document Compiler  │ ──► CompiledDocument (Editable AST + ResolvedStyleMap)
                         └──────────┬──────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┬──────────────────────────┐
         ▼                          ▼                          ▼                          ▼
  Chapters View             Chapter Editor              Live Preview                Export Pipeline
(Structural Cards)      (Effective Typography)       (Paged Layout DOM)         (PDF, DOCX, EPUB, HTML)
```

---

## 3. CURRENT ARCHITECTURE AUDIT

Based on inspection of `anclora-talent` codebase at SHA `35ce26a`:

| Capability | Implementation Files | Status | Findings & Technical Debt |
| :--- | :--- | :--- | :--- |
| **DOCX Import** | `src/lib/projects/import.ts`, `import-pipeline.ts` | `EXISTS_PARTIAL` | Uses `mammoth` with fallback to `word-extractor`. Style mapping is hardcoded to English names (`'Heading 1'`, `'TOC 1'`). Spanish Word styles (`'Título 1'`, `'Índice 1'`) fall back to raw text. |
| **Markdown Import** | `src/lib/projects/import-pipeline.ts` | `EXISTS_AND_WORKS` | Front-matter parsing, markdown heading syntax (`#`), list parsing, and paragraph extraction work reliably. |
| **Document Structure Extraction** | `src/lib/projects/import-pipeline.ts` | `EXISTS_PARTIAL` | Heuristic block classification. Prone to false positives; does not isolate TOC blocks from document body. |
| **Chapter Detection** | `src/lib/projects/import-pipeline.ts` (`isMajorChapterBlock`) | `EXISTS_PARTIAL` | Driven by `MAJOR_HEADING_RE`. Any line matching keywords (e.g., `"Capítulo 1..."`) becomes a chapter, even when inside a TOC. |
| **Heading Detection** | `src/lib/projects/import-pipeline.ts` (`cleanHeadingText`) | `EXISTS_PARTIAL` | Cleans leading `#` and numbers (`1. `), but does not detect or strip trailing tab/leader page numbers (`... 4`). |
| **TOC Handling** | `src/lib/projects/import-pipeline.ts`, `src/lib/preview/toc-numbering.ts` | `EXISTS_PARTIAL` | Preview regenerates TOC, but import pipeline treats source TOC as content blocks, duplicating chapters and polluting titles. |
| **Word Style Parsing** | `src/lib/projects/docx-styles.ts`, `src/lib/reference-editorial-profile/docx.ts` | `EXISTS_PARTIAL` | Regex-based OOXML parsing extracts `Normal`, `Heading1..3`, `Quote`, page size, and margins. Disconnected from manuscript importer. |
| **Footnotes** | `src/lib/document/model.ts`, `from-html.ts` | `EXISTS_PARTIAL` | Mammoth converts footnotes to anchors/endnotes, but AST lacks a semantic `FootnoteBlock` or inline footnote marker entity. |
| **Tables** | `src/lib/document/model.ts`, `from-html.ts`, `to-html.ts` | `EXISTS_AND_WORKS` | `TableBlock` AST exists, HTML round-tripping works, export builder renders tables cleanly. |
| **Lists** | `src/lib/document/model.ts`, `from-html.ts`, `to-html.ts` | `EXISTS_AND_WORKS` | `ListBlock` (ordered/unordered) exists, parses cleanly, renders across editor and exports. |
| **Header/Footer Import** | `src/lib/reference-editorial-profile/docx.ts` | `EXISTS_PARTIAL` | Detects presence of `header*.xml` / `footer*.xml` for reference styles, but strips them from manuscript text. |
| **Page Metadata** | `src/lib/projects/composition.ts`, `src/lib/preview/device-configs.ts` | `EXISTS_AND_WORKS` | Margin presets, page sizes (laptop, tablet, print), and composition settings are well modeled. |
| **Typography Infrastructure** | `src/lib/reference-editorial-profile/font-normalization.ts`, `useGoogleFonts.ts` | `EXISTS_PARTIAL` | Normalizes font families and maps system fallbacks, but font resolution is not dynamically wired into the editor container. |
| **Document Metadata** | `src/lib/db/schema.ts` (`project_documents`), `src/lib/document/model.ts` | `EXISTS_AND_WORKS` | Stores title, subtitle, author, language, composition, reference profile, and rules in JSONB. |
| **Reference Document Upload** | `src/lib/reference-editorial-profile/actions.ts`, `docx.ts`, `pdf.ts` | `EXISTS_AND_WORKS` (Extraction) / `EXISTS_BUT_DISCONNECTED` (Application) | Extracts `ReferenceEditorialProfile` from DOCX/PDF with confidence scores. But `apply.ts` only sets `fontFamily` and `margins` if unset; heading styles and colors are ignored. |
| **Brand Document Upload** | `src/lib/brand/extract-brand-profile.ts`, `repository.ts` | `EXISTS_AND_WORKS` | Extracts palette, typography pair, and voice rules from PDF with confidence scores. Persisted in `brand_profiles`. |
| **Editor Document Model** | `src/lib/document/model.ts` (`SemanticDocument`, `DocumentBlock`) | `EXISTS_AND_WORKS` | Clean, serializable, block-based AST with stable hashing. |
| **Chapter Editor Rendering** | `src/components/projects/AdvancedRichTextEditor.tsx`, `ChapterEditorFullscreen.tsx` | `EXISTS_BUT_DISCONNECTED` | Fallback hardcoded to `'Liberation Serif'`. Editor container uses static Tailwind utility classes. Toolbar ignores reference heading/quote styles. |
| **Preview Engine** | `src/lib/compose/preview-adapter.ts`, `src/components/projects/PreviewCanvas.tsx` | `EXISTS_PARTIAL` | Uses `composeProjectPreview` with `ComposeTemplate`. Applies basic font/margin settings and brand overrides, but ignores full reference heading/spacing rules. |
| **Export Pipelines** | `src/lib/projects/export-builder.tsx`, `src/lib/epub/epub-writer.ts` | `EXISTS_PARTIAL` | Supports PDF, DOCX, HTML, EPUB. Applies brand colors and body font, but ignores reference heading hierarchy, indentation, and footnote styling. |
| **Persistence** | `src/lib/db/schema.ts`, `src/lib/projects/retrieval.ts` | `EXISTS_AND_WORKS` | PostgreSQL via Neon, Drizzle ORM. Stores `project_documents`, `brand_profiles`, `structure_profiles`, `document_snapshots`. |
| **Style Configuration** | `src/lib/projects/composition.ts` | `EXISTS_PARTIAL` | Only models `fontFamily`, `fontSizePt`, `lineHeight`, `margins`. Lacks heading styles, colors, quotes, and list spacing. |
| **Brand Configuration** | `src/lib/brand/brand-template-overrides.ts`, `resolve.ts` | `EXISTS_BUT_DISCONNECTED` | Translates `BrandProfile` into `ComposeTemplate` overrides, but completely bypassed by the Chapter Editor. |

---

## 4. GAP ANALYSIS

1. **Root Cause of Mangled Chapter Titles ("Introducción 3")**:
   - `extractTextFromBuffer` in `import-pipeline.ts` uses Mammoth with a limited style map (`"p[style-name='TOC 1'] => p:fresh"`). Word documents with Spanish styles (`"Índice 1"`, `"TOC1"`, or default paragraph runs) produce paragraphs containing tab characters or trailing page digits.
   - `parseTextBlocks` runs `isLikelyStandaloneHeading` and `MAJOR_HEADING_RE.test()`. Lines such as `"Capítulo 1. El coste invisible del ruido 4"` match `MAJOR_HEADING_RE`.
   - `cleanHeadingText()` only strips leading numbering and `#` symbols (`/^\d+(?:\.\d+)*[.)]\s+/`). It does **not** strip trailing tab stops, leader dots, or page numbers (`/\s*[\t.·_-]+\s*\d+\s*$/`).
   - Consequently, each TOC line is promoted into an independent chapter whose title contains the page number.

2. **Root Cause of Ignored Reference Styles**:
   - `applyReferenceEditorialProfileToComposition()` only sets `next.fontFamily`, `next.fontSizePt`, `next.lineHeight`, and `next.margins`—and only if they were previously undefined.
   - It completely discards: `headings.h1..h4`, `chapterOpening`, `quote`, `lists`, `toc`, `separators`, and `palette`.
   - The editor and export components never inspect `project.document.metadata.referenceEditorialProfile.headings`.

3. **Root Cause of Chapter Editor Styling Disconnect**:
   - In `ProjectWorkspace.tsx` (line 599):
     ```typescript
     const effectiveFontFamily = project.document.metadata?.composition?.fontFamily ?? 'Liberation Serif';
     ```
   - In `AdvancedRichTextEditor.tsx` (line 457):
     ```typescript
     const effectiveFont = effectiveFontFamily?.trim() || 'Liberation Serif';
     ```
   - In `AdvancedRichTextEditor.tsx` (line 97): The editor wrapper is styled with static classes (`[&_h1]:text-2xl [&_h1]:font-black`). CSS variables for `--editor-heading-font`, `--editor-heading-color`, `--editor-body-font`, etc., are missing.

---

## 5. TARGET ARCHITECTURE

The pipeline operates in five discrete stages, maintaining pure separation between **Content**, **Editorial Style**, **Brand Identity**, and **Resolved Presentation**:

```text
[DOCX / MD Manuscript]
         │
         ▼
┌─────────────────────────────────┐
│ Stage A: Semantic Importer      │ ──► Produces SemanticDocument AST
│ - Isolates TOC from body        │     (blocks: Heading, Paragraph, Table, List, etc.)
│ - Cleans trailing page numbers  │     (metadata: title, author, etc.)
│ - Strips Word artifacts         │
└─────────────────────────────────┘

[Reference DOCX / PDF]
         │
         ▼
┌─────────────────────────────────┐
│ Stage B: Style Extractor        │ ──► Produces EditorialStyleProfile
│ - Page geometry & margins       │     (body, h1..h4, quotes, lists, spacing)
│ - Typographic hierarchy         │     (confidence scores & provenance)
└─────────────────────────────────┘

[Brand Manual PDF / Palette UI]
         │
         ▼
┌─────────────────────────────────┐
│ Stage C: Brand Profile Store    │ ──► Produces BrandProfile
│ - ink, paper, accent tokens     │     (display typeface, body typeface)
│ - Typographic pair              │
└─────────────────────────────────┘

                   ┌──────────────────────────────┐
                   │ Stage D: Style Cascade       │ ◄── [User Overrides]
                   │ & Resolver                   │
                   │ Precedence:                  │
                   │ 1. User Style Overrides      │
                   │ 2. Reference Style Profile   │
                   │ 3. Brand Identity Tokens     │
                   │ 4. Manuscript Source Styles  │
                   │ 5. Talent Default Fallbacks  │
                   └──────────────┬───────────────┘
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │ Stage E: Document Compiler   │
                   │ - Binds AST to ResolvedStyle │
                   │ - Emits DocumentStyleMap     │
                   │ - Emits CSS Custom Properties│
                   └──────────────┬───────────────┘
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │ CompiledDocument             │
                   │ (Editable AST + Style Map)   │
                   └──────────────┬───────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
Chapters Screen            Chapter Editor            Preview & Exports
(Structural cards)       (Injected CSS vars)       (Paged Layout Engine)
```

### Stage A: Manuscript Semantic Importer
- **Input**: DOCX binary, Markdown text, or plain text.
- **Output**: Pure `SemanticDocument` AST (`DocumentBlock[]`).
- **Core Rules**:
  - Differentiates the structural TOC block from body chapters.
  - Recognizes Word TOC field codes (`w:fldSimple`, `w:instrText TOC`), OOXML styles (`TOC 1..3`, `Índice 1..3`), and Mammoth TOC tags.
  - Strips trailing TOC leader dots and page digits (`/\s*[\t.·_—\-]{2,}\s*\d+\s*$/` and `/\s+\d{1,4}$/` in TOC context) so titles are never contaminated.
  - Preserves footnotes as semantic inline/block attachments rather than plain text suffixes.

### Stage B: Reference Style Extractor
- **Input**: Reference DOCX or PDF file.
- **Output**: Reusable, structured `EditorialStyleProfile`.
- **Scope**: Page geometry (trim, margins, gutter), body typography (font family, size, line height, paragraph spacing, first-line indent), heading scale (H1–H4 font, size, weight, alignment, spacing before/after), quotes, lists, headers/footers, and page-number positioning. Source text is completely discarded.

### Stage C: Brand Profile
- **Input**: Brand manual PDF or interactive Brand Workspace configuration.
- **Output**: Structured `BrandProfile`.
- **Scope**: Semantic tokens (`ink`, `paper`, `accent`, `accentMuted`), typographic pair (`display` for headings/quotes, `body` for prose/lists), rules/dividers, callout palettes.
- **Property Governance Matrix**:
  - `AUTO-DETECTABLE`: Hex swatches with role keywords, declared primary typefaces, global usage proportions.
  - `USER-CONFIRMABLE`: Palette role assignment when confidence < 0.85, secondary/accent fonts.
  - `MANUALLY_CONFIGURABLE`: Custom hex overrides, font-family substitution from Google Fonts / system fonts, letter spacing.
  - `UNSUPPORTED`: Complex multi-column grid layouts, arbitrary decorative vector shapes, non-standard CMYK color profiles.

### Stage D: Style Cascade & Resolver
Deterministic precedence formula:
$$\text{Effective Style} = \text{User Override} \succ \text{Reference Style} \succ \text{Brand Token} \succ \text{Manuscript Style} \succ \text{Talent Default}$$

- **Non-Destructive Fusion Example**:
  - Reference: `H1 = { fontFamily: "Noto Serif", fontSize: 24, fontWeight: "bold", spacingAfter: 18 }`
  - Brand: `headingAccent = "#D97706"` (Amber)
  - Resolved `H1`: `{ fontFamily: "Noto Serif", fontSize: 24, fontWeight: "bold", spacingAfter: 18, color: "#D97706" }`
  - Brand injects color/accent without overwriting the editorial scale and typography established by the reference document.

### Stage E: Document Style Compiler
- **Input**: `SemanticDocument` + `EditorialStyleProfile` + `BrandProfile` + `UserStyleOverrides`.
- **Output**: `CompiledDocument` containing:
  1. `document`: The canonical editable AST (`SemanticDocument`).
  2. `styleMap`: A computed `DocumentStyleMap` mapping each AST node role to its fully resolved visual attributes.
  3. `cssVariables`: A serialized dictionary of CSS custom properties injected into the DOM container of the Chapter Editor and Preview.

### Stage F: Rendering Architecture
The compiled document drives all presentation surfaces:
- **Chapters Screen**: Displays structural cards using resolved heading typefaces and chapter numbering.
- **Chapter Editor**: Injects `cssVariables` directly into the editor wrapper; toolbar accurately reflects computed font family, size, and weight.
- **Preview Engine**: Consumes `CompiledDocument` and `ComposeTemplate` to render paginated HTML identical to export.
- **Export Pipeline**: Maps the exact same `DocumentStyleMap` to React-PDF primitives, DOCX XML formatting, EPUB CSS, and HTML output.

---

## 6. CANONICAL DATA MODEL

The following canonical models extend existing types in `src/lib/document/model.ts`, `src/lib/reference-editorial-profile/model.ts`, and `src/lib/brand/brand-profile.ts`:

```typescript
// ============================================================================
// 1. STYLE TOKENS & RESOLVED VALUES
// ============================================================================

export type CssLength = string; // e.g. "12pt", "16px", "1.5em"

export interface ResolvedTextStyle {
  fontFamily: string;
  fontSizePt: number;
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;           // Normalized #RRGGBB
  lineHeight: number;       // Unitless multiplier (e.g. 1.45)
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  letterSpacingPt?: number;
  firstLineIndentPt?: number;
  spacingBeforePt?: number;
  spacingAfterPt?: number;
}

export interface ResolvedPageGeometry {
  widthPt: number;
  heightPt: number;
  marginsPt: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  gutterPt: number;
  columns: number;
}

export interface ResolvedDecorationStyle {
  dividerColor: string;
  dividerWidthPt: number;
  accentColor: string;
  quoteBorderColor: string;
  quoteBorderWidthPt: number;
}

// ============================================================================
// 2. DOCUMENT STYLE MAP
// ============================================================================

export interface DocumentStyleMap {
  version: 1;
  compiledAt: string;
  page: ResolvedPageGeometry;
  body: ResolvedTextStyle;
  headings: {
    h1: ResolvedTextStyle;
    h2: ResolvedTextStyle;
    h3: ResolvedTextStyle;
    h4: ResolvedTextStyle;
  };
  quote: ResolvedTextStyle & { borderLeftWidthPt: number; borderLeftColor: string };
  list: ResolvedTextStyle & { markerColor?: string; itemSpacingPt: number };
  table: {
    header: ResolvedTextStyle & { backgroundColor: string };
    cell: ResolvedTextStyle;
    borderColor: string;
    borderWidthPt: number;
  };
  footnote: ResolvedTextStyle;
  header: ResolvedTextStyle & { borderBottom?: boolean };
  footer: ResolvedTextStyle & { borderTop?: boolean };
  decorations: ResolvedDecorationStyle;
}

// ============================================================================
// 3. USER STYLE OVERRIDES
// ============================================================================

export interface UserStyleOverride {
  scope: 'global' | 'role' | 'block';
  targetRole?: 'body' | 'h1' | 'h2' | 'h3' | 'quote' | 'table' | 'footer';
  targetBlockId?: string; // Anchor to specific AST block
  styles: Partial<ResolvedTextStyle>;
  updatedAt: string;
}

// ============================================================================
// 4. COMPILED DOCUMENT (Single Source of Truth)
// ============================================================================

export interface CompiledDocument {
  version: 1;
  projectId: string;
  /** Pure content AST — completely decoupled from styling */
  document: SemanticDocument;
  /** Fully resolved style dictionary */
  styleMap: DocumentStyleMap;
  /** Injected CSS variables for DOM rendering */
  cssVariables: Record<string, string>;
  /** Provenance and binding metadata */
  bindings: {
    referenceProfileId?: string;
    referenceSourceHash?: string;
    brandProfileId?: string;
    brandVersion?: number;
    overridesCount: number;
  };
  compiledAt: string;
}
```

### Source of Truth, Persistence & Derived Status:

| Model | Source of Truth | Persistence Location | Derived vs. Stored |
| :--- | :--- | :--- | :--- |
| `SemanticDocument` | Project content & structure | `project_documents.document_model` (JSONB) | **Stored** |
| `EditorialStyleProfile` | Extracted visual rules from reference | `project_documents.metadata.referenceEditorialProfile` (JSONB) | **Stored** |
| `BrandProfile` | User brand theme pack | `brand_profiles` table (row per user/brand) | **Stored** |
| `UserStyleOverride[]` | Explicit user formatting choices | `project_documents.metadata.userOverrides` (JSONB) | **Stored** |
| `DocumentStyleMap` | Computed cascade resolution | Memory / runtime cache; optional snapshot in `document_snapshots` | **Derived** |
| `CompiledDocument` | Pure compiler function result | Memory / request scope; rendered on-the-fly | **Derived** |

---

## 7. SEMANTIC WORD IMPORT & TOC ISOLATION

### 7.1 Word OOXML Structural Disambiguation
Word documents store Table of Contents in multiple distinct structures:
1. **Field Codes**: `<w:fldSimple w:instr="TOC \o &quot;1-3&quot; \h \z \u">` or complex field blocks (`<w:fldChar w:fldCharType="begin"/> ... <w:instrText>TOC ...</w:instrText>`).
2. **Dedicated Paragraph Styles**: Paragraphs with `<w:pStyle w:val="TOC1"/>`, `<w:pStyle w:val="TOC2"/>`, `<w:pStyle w:val="Indice1"/>`, etc.
3. **Tab Leaders & Trailing Digits**: Paragraphs where text is terminated with a tab run `<w:tab/>` followed by page digits `<w:t>4</w:t>`.

### 7.2 Importer Isolation Contract
1. **TOC Recognition**:
   - The importer detects any block marked with TOC field codes or TOC styles and flags it as `isTocBlock: true`.
   - In plain text / heuristic fallback mode, any sequence of lines following an `"Índice"` / `"Table of Contents"` heading where lines match `/\s*[\t.·_—\-]{2,}\s*\d+\s*$/` is captured as an isolated TOC structure.
2. **Exclusion from Body Chapters**:
   - Blocks flagged as `isTocBlock` **must never** enter `buildChaptersFromBlocks()`.
   - `isMajorChapterBlock()` is explicitly skipped for any block within the TOC range.
3. **Title Cleaning Invariant**:
   - Every detected heading undergoes strict trailing folio stripping:
     ```typescript
     export function cleanHeadingTitle(raw: string): string {
       return raw
         // Strip markdown leading hashtags
         .replace(/^#{1,6}\s+/, '')
         // Strip leading numeric enumerations like "1. ", "1.1 ", "Capítulo 1: "
         .replace(/^(?:cap[íi]tulo\s+\d+|chapter\s+\d+|parte\s+\d+)[.:]\s*/i, '')
         .replace(/^\d+(?:\.\d+)*[.)]\s+/, '')
         // Strip trailing leader characters + page numbers (e.g. ".... 4", " - 12", "\t3")
         .replace(/[\t\s]+[·._\-—―]+\s*\d{1,4}\s*$/, '')
         .replace(/[\t\s]+\d{1,4}\s*$/, '')
         .trim();
     }
     ```
   - *Test Acceptance*: `"Capítulo 1. El coste invisible del ruido 4"` $\rightarrow$ Title: `"Capítulo 1. El coste invisible del ruido"`, Trailing Number `4` stripped.
   - `"Introducción 3"` $\rightarrow$ Title: `"Introducción"`, Trailing Number `3` stripped.

---

## 8. TABLE OF CONTENTS MODEL

Talent adopts **Strategy B: Authoritative Semantic Regeneration**:
- Source Word TOC page numbers are fundamentally stale upon import (page counts differ between Word letter/A4 and Talent book trim sizes).
- **Import Behavior**: The imported Word TOC is parsed purely to verify chapter ordering and structure, then discarded as body text.
- **Runtime Generation**: The TOC chapter is synthesized dynamically by the composition engine (`compose(document, rules, template)`) based on actual chapter start pages in Talent.
- **Export Behavior**:
  - **Editor**: Displays TOC as a live, non-editable structural widget reflecting current chapter titles.
  - **Preview**: Renders pages with exact layout, dot leaders, and live page numbers.
  - **PDF Export**: Emits dot leaders (`....`) and computed page numbers calculated by `@react-pdf/renderer`.
  - **DOCX Export**: Generates a native Word TOC field (`{ TOC \o "1-3" \h \z \u }`) so Word updates pagination natively.
  - **EPUB Export**: Emits semantic `<nav epub:type="toc">` with hyperlinks to chapter IDs without static page numbers (reflowable format standard).

---

## 9. REFERENCE DOCUMENT SEMANTICS

The reference DOCX is an **Editorial Style Source**, not a manuscript. Prose from the reference file is never imported into the project.

### 9.1 Extracted Properties
1. **Page Geometry**: Width, height, top/bottom/left/right margins, gutter, column count.
2. **Body Text (`Normal`)**: Font family (normalized via Google Fonts registry), size in pt, weight, style, line height, text alignment, first-line indent, paragraph spacing after.
3. **Heading Hierarchy (`Heading 1` through `Heading 4`, `Title`, `Subtitle`)**: Font family, font size, font weight, text transform, alignment, spacing before/after, page-break behavior before chapter titles.
4. **Editorial Accents**: Blockquote left border width, color, and font style; list marker indent; table header background and border styles; footnote font size and separator rule.

### 9.2 Style Role Mapping Table
Word styles in the reference document map to canonical Talent roles:

| Reference Word Style ID | Localized Aliases (ES/EN) | Canonical Talent Role | Target Document AST Node |
| :--- | :--- | :--- | :--- |
| `Title` | Título, Title | `DocumentTitle` | Document Front Matter / Cover |
| `Subtitle` | Subtítulo, Subtitle | `DocumentSubtitle` | Document Front Matter |
| `Heading 1` | Título 1, Encabezado 1 | `ChapterTitle` / `H1` | `HeadingBlock` (level 1) |
| `Heading 2` | Título 2, Encabezado 2 | `SectionTitle` / `H2` | `HeadingBlock` (level 2) |
| `Heading 3` | Título 3, Encabezado 3 | `SubsectionTitle` / `H3`| `HeadingBlock` (level 3) |
| `Heading 4` | Título 4, Encabezado 4 | `Subheading` / `H4` | `HeadingBlock` (level 4) |
| `Normal` | Normal, Párrafo estándar | `BodyText` | `ParagraphBlock` |
| `Quote` | Cita, Quote, Blockquote | `BlockQuote` | `QuoteBlock` |
| `ListBullet` | Lista con viñetas, Bullet | `UnorderedList` | `ListBlock` (`ordered: false`) |
| `ListNumber` | Lista numerada, Numbered | `OrderedList` | `ListBlock` (`ordered: true`) |
| `FootnoteText` | Texto nota pie, Footnote | `Footnote` | `Footnote` text |
| `Header` | Encabezado | `PageHeader` | Running Page Header |
| `Footer` | Pie de página | `PageFooter` | Running Page Footer |

---

## 10. BRAND DOCUMENT SEMANTICS

Brand manual PDFs define the visual and identity palette. Extraction runs once on upload/attachment, creating a versioned, reusable `BrandProfile`.

### 10.1 Extraction Categorization
- **AUTO-DETECTABLE**:
  - Hex color codes (`#RRGGBB`) associated with role keywords (`ink`, `paper`, `accent`, `gold`, `tinta`, `papel`, `acento`).
  - Font family names referenced in typography declarations (`"porta la voz editorial"`, `"titulares en"`).
  - Relative usage proportions (e.g. 55% ink, 30% paper, 10% accent, 5% muted).
- **USER-CONFIRMABLE**:
  - Palette roles when confidence score is between 0.50 and 0.85.
  - Font mapping when the exact brand font is a proprietary desktop font (e.g., `"Futura PT"`) requiring a web-safe/Google Fonts substitute (e.g., `"Inter"` or `"Montserrat"`).
- **MANUALLY_CONFIGURABLE**:
  - Custom color additions, manual palette role reassignments, font weight selections.
- **UNSUPPORTED**:
  - Multi-column editorial page grids, freeform background vector artwork, CMYK spot colors.

### 10.2 Persistence as Reusable Asset
Extracted brand profiles are stored in the `brand_profiles` table, versioned per user. Linking a brand profile to a project stores `projects.brandProfileId`, allowing multiple projects to share the same brand identity without duplicate extraction.

---

## 11. SOURCE CONFIDENCE & PROVENANCE

Every property in `EditorialStyleProfile` and `BrandProfile` retains provenance metadata:
```typescript
export interface PropertyProvenance<T> {
  value: T;
  source: 'reference-docx' | 'brand-pdf' | 'manuscript-docx' | 'user-override' | 'talent-default';
  confidence: number; // 0.0 to 1.0
  confirmedByUser: boolean;
  extractedAt: string;
}
```
- Confidence $\ge 0.85$: Applied automatically.
- Confidence $< 0.85$: Tagged with warning; user can review in the Brand/Editorial Inspector panel.

---

## 12. NON-DESTRUCTIVE REAPPLICATION

A fundamental invariant of this architecture: **Style and Content are Strictly Orthogonal**.
- Reapplying, swapping, or deleting a Reference Document or Brand Profile mutates **only** the `DocumentStyleMap` and `metadata`.
- It **never** triggers re-import of manuscript prose.
- Any text typed in the Chapter Editor, split chapters, or custom block ordering remains 100% intact.
- Recompilation execution:
  ```text
  Existing SemanticDocument AST (Unmodified)
  + New Reference EditorialStyleProfile
  + Existing BrandProfile
  + Existing UserStyleOverrides
  ──────────────────────────────────────────
  = New CompiledDocument (Re-styled instantly)
  ```

---

## 13. USER OVERRIDE BEHAVIOR

The Style Cascade evaluates formatting rules with strict precedence:

```text
1. Explicit Local Block Override (e.g. paragraph marked specifically as 14pt)
   ↓
2. Explicit Role Override (e.g. user set all H2 to italic in settings)
   ↓
3. Reference Style Profile (e.g. H2 is 18pt Georgia bold from reference docx)
   ↓
4. Brand Profile Token (e.g. H2 color is Brand Accent Gold #D4AF37)
   ↓
5. Manuscript Source Style (e.g. inline bolding/italics from original docx)
   ↓
6. Talent Default Preset (e.g. fallback system typography)
```

### Override Management Semantics:
- **Local Overrides**: Preserved across reference/brand swaps.
- **Reset to Reference**: Wipes user overrides for a given role and falls back to reference document values.
- **Reset to Brand/Default**: Wipes reference overrides and applies pure brand/system defaults.

---

## 14. REFERENCE & BRAND CHANGE UX

### Reference Change UX:
When a user uploads a new reference document or selects a different reference profile from the library:
1. System shows a non-blocking confirmation dialog:
   - Summary of detected changes (e.g., *"Body font: Georgia $\rightarrow$ Garamond"*, *"Margins: 24px $\rightarrow$ 32px"*).
   - Option to: `[Apply & Keep Local Overrides]` (Default) or `[Apply & Reset All to Reference]`.
2. Content is untouched; styles recompile in $< 50\text{ ms}$.

### Brand Change UX:
When a brand profile is changed:
1. Preview displays color swatches and typography pair.
2. User clicks `[Apply Brand]`.
3. Accent colors, heading colors, and display fonts update across editor and preview immediately without altering manuscript text.

---

## 15. CHAPTERS SCREEN INTEGRATION

The **Chapters Screen** (Step 2 in the workspace) consumes the `CompiledDocument`:
- Each chapter card displays:
  - Formatted title rendered with the resolved `H1` font family and weight.
  - Clean chapter title free of TOC page numbers.
  - Accurate block and word counts.
  - Visual indicator of assigned style rules.
- Representative thumbnail preview uses compiled styles rather than raw unstyled HTML.

---

## 16. CHAPTER EDITOR INTEGRATION

### 16.1 Injected CSS Custom Properties
The Chapter Editor container wraps Tiptap inside an element styled with compiled CSS variables:
```css
.talent-chapter-editor-shell {
  --talent-body-font: var(--resolved-body-font, 'Liberation Serif');
  --talent-body-size: var(--resolved-body-size, 12pt);
  --talent-body-line-height: var(--resolved-body-line-height, 1.5);
  --talent-body-color: var(--resolved-body-color, #111827);
  --talent-h1-font: var(--resolved-h1-font, var(--talent-body-font));
  --talent-h1-size: var(--resolved-h1-size, 24pt);
  --talent-h1-color: var(--resolved-h1-color, #111827);
  --talent-h2-font: var(--resolved-h2-font, var(--talent-body-font));
  --talent-h2-size: var(--resolved-h2-size, 18pt);
  --talent-h2-color: var(--resolved-h2-color, #111827);
  --talent-quote-font: var(--resolved-quote-font, var(--talent-body-font));
  --talent-quote-border-color: var(--resolved-quote-border, #d97706);
}
```

### 16.2 Accurate Toolbar Representation
- The font family picker in `AdvancedRichTextEditor` checks the active selection:
  - If selection is in paragraph $\rightarrow$ displays resolved body font (e.g. `"Noto Serif"`).
  - If selection is in H1/H2 $\rightarrow$ displays resolved heading font (e.g. `"Cinzel"` or `"Fraunces"`).
  - If user applied a manual inline font $\rightarrow$ displays local override font.
- Never displays `"Default"` or `"Liberation Serif"` when a resolved font exists.

---

## 17. PREVIEW INTEGRATION

- `PreviewCanvas` and `PreviewModal` execute `composeProjectPreview()` using the compiled `ComposeTemplate`.
- Page layout engine uses exact margins, column dimensions, and typography computed during compilation.
- Pagination is authoritative and continuous.

---

## 18. EXPORT INTEGRATION & CAPABILITY MATRIX

| Property / Feature | Chapter Editor | Preview Canvas | PDF Export (`@react-pdf`) | DOCX Export (`docx`) | EPUB Export (`epub-writer`) | HTML Export |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Body Font Family** | ✅ Live CSS | ✅ Paged Canvas | ✅ Native Embedded Font | ✅ Native Word Font | ✅ Embedded WOFF2 / CSS | ✅ Web Font |
| **Heading Font Families** | ✅ Live CSS | ✅ Paged Canvas | ✅ Native Embedded Font | ✅ Native Word Font | ✅ Embedded WOFF2 / CSS | ✅ Web Font |
| **Font Sizes & Line Heights**| ✅ Live CSS | ✅ Exact Points | ✅ Exact Points (`pt`) | ✅ Half-points (`w:sz`) | ✅ Relative / Rem | ✅ Rem / Px |
| **Brand Ink / Text Colors** | ✅ Live CSS | ✅ Exact Hex | ✅ RGB Hex | ✅ Word Hex (`w:color`) | ✅ CSS Hex | ✅ CSS Hex |
| **Brand Accent / Headings** | ✅ Live CSS | ✅ Exact Hex | ✅ RGB Hex | ✅ Word Hex (`w:color`) | ✅ CSS Hex | ✅ CSS Hex |
| **Margins & Page Trim** | ⚠️ Viewport sim | ✅ Exact Paged | ✅ Exact Points (`pt`) | ✅ Twips (`w:pgMar`) | ❌ Reflowable | ⚠️ Responsive |
| **First Line Indent** | ✅ Live CSS | ✅ Exact Points | ✅ Exact Points (`pt`) | ✅ Twips (`w:ind`) | ✅ CSS Indent | ✅ CSS Indent |
| **Blockquote Styling** | ✅ Border + Italic| ✅ Border + Italic | ✅ Exact Border + Ink | ✅ Left border style | ✅ CSS Border | ✅ CSS Border |
| **Footnotes** | ⚠️ Inline marker| ✅ Bottom of page | ✅ Page-anchored bottom | ✅ Native Word footnotes | ✅ End-of-chapter notes| ✅ `<aside>` notes |
| **TOC Rendering** | ⚠️ Read-only card| ✅ Exact Paged | ✅ Dot leaders + Paged | ✅ Native Word `{TOC}` | ✅ `<nav epub:type="toc">`| ✅ Hyperlinked list |

---

## 19. FIXED PDF SEPARATION (CRITICAL BOUNDARY)

Fixed-PDF document mode (`document_mode = 'fixed-pdf'`) is governed by strict byte-fidelity rules:
- **Editable Manuscript Pipeline**: Applies to DOCX, Markdown, and editable text imports.
- **Fixed-PDF Pipeline**: The source PDF is treated as immutable binary geometry (`anclora-talent-source-documents` Blob).
- **Separation Guarantee**: The Reference + Brand compilation pipeline **must never** attempt to re-flow, restyle, or alter original PDF pages.
- When `isFixedPdfProject(project)` is true, reference styling and brand font overrides are disabled for content pages, applying solely to Cover/Back-Cover surfaces.

---

## 20. PERSISTENCE, DATABASE & API IMPACT

### 20.1 Database Audit & Strategy: `NO_SCHEMA_CHANGE` (Recommended)
Current schema in `src/lib/db/schema.ts` already provides:
- `project_documents.document_model` (JSONB): Stores pure `SemanticDocument` AST.
- `project_documents.metadata` (JSONB): Fully supports storing `referenceEditorialProfile`, `composition`, `userOverrides`, and `styleBindings`.
- `projects.brandProfileId` (UUID): Links project to versioned `brand_profiles`.
- `structure_profiles` table: Already stores reusable reference schemas.
- **Conclusion**: `NO_SCHEMA_CHANGE` required for initial delivery. All new compiled attributes live within existing JSONB columns without running database migrations or schema pushes.

### 20.2 API & Server Actions Impact
1. `extractReferenceEditorialProfileAction` (`src/lib/reference-editorial-profile/actions.ts`):
   - Status: `MODIFY`. Enhance to extract full heading hierarchy, quote styles, list metrics, and color palettes.
2. `applyReferenceEditorialProfileAction`:
   - Status: `NEW`. Server action to link a reference profile to a project and recompile styles non-destructively.
3. `recompileProjectStylesAction`:
   - Status: `NEW`. Lightweight server action to trigger deterministic recompilation and persist updated `metadata`.
4. `saveUserStyleOverrideAction`:
   - Status: `NEW`. Persists granular user overrides to `project_documents.metadata.userOverrides`.

---

## 21. SECURITY & FILE HANDLING

1. **DOCX Parsing Safety**:
   - Limit DOCX ZIP entity expansion (`JSZip`) to prevent zip bomb attacks (max 50 MB uncompressed, max 20,000 files).
   - Sanitize all XML strings before regex/DOM extraction.
2. **PDF Parsing Safety**:
   - Run PDF analysis with strict 30-second timeout (`ReferenceAnalysisTimeoutError`).
   - File size ceiling: 50 MB.
3. **Font Injection Protection**:
   - Sanitize font family names against a strict whitelist/regex (`/^[a-zA-Z0-9 -]+$/`) to prevent CSS injection attacks.

---

## 22. PERFORMANCE & RECOMPILATION BOUNDARIES

Style compilation is a pure in-memory calculation taking $< 15\text{ ms}$ for a 100,000-word manuscript.
- **Recompilation Triggers**:
  - Reference document uploaded or changed.
  - Brand profile attached or changed.
  - User explicitly modifies a global or role style override.
- **Non-Triggers**:
  - Routine typing in Chapter Editor (typing mutates local editor state; does not re-run style cascade).
  - Switching between chapters in the editor.

---

## 23. FAILURE MODES & GRACEFUL DEGRADATION

| Failure Scenario | Fallback Behavior | User Notification |
| :--- | :--- | :--- |
| **Reference DOCX has no heading styles** | Fall back to body font with standard typographic scaling ratio (1.25x for H3, 1.5x for H2, 2.0x for H1). | Non-blocking warning: *"Estilos de encabezado no detectados en la referencia; se aplicó escala proporcional."* |
| **Brand PDF yields low-confidence colors** | Fall back to Talent default palette (Dark ink, cream paper, gold accent). | Inspector flags unconfirmed colors with a yellow review badge. |
| **Font family not found in Google Fonts** | Map font family to closest canonical fallback via `font-normalization.ts` (e.g. `"Garamond Premier Pro"` $\rightarrow$ `"EB Garamond"`). | Editor displays normalized font name with a fallback indicator. |
| **Corrupted / unreadable reference file** | Keep current project styles untouched; reject reference upload. | Error banner: *"No se pudo leer el archivo de referencia. Comprueba que sea un DOCX válido."* |
| **Reference profile deleted from library** | Project retains inlined copy in `project_documents.metadata.referenceEditorialProfile`. | No disruption to active project. |

---

## 24. PHASED IMPLEMENTATION PLAN

```text
Phase 0: Architecture Baseline & Test Corpus Harness
Phase 1: Canonical Semantic Manuscript Importer & TOC Sanitization
Phase 2: Comprehensive Reference Style Extractor
Phase 3: Brand Profile Token Integration
Phase 4: Deterministic Style Cascade & Resolver Engine
Phase 5: Document Style Compiler & CSS Variable Generator
Phase 6: Chapter Editor Visual Integration & Live Toolbar
Phase 7: Chapters Screen & Preview Engine Integration
Phase 8: Export Pipeline Style Unification
Phase 9: Non-Destructive Reapplication & User Overrides UX
Phase 10: Backward Compatibility & Legacy Project Hydration
Phase 11: End-to-End Test Pack Verification & Release Gate
```

---

## 25. MICRO-TASKS SPECIFICATION

### PHASE 0 — Architecture Baseline & Test Corpus Harness

#### P0-T01 — Create Compilation Pipeline Test Harness & Fixtures
- **Objective**: Establish reproducible test harness using the test pack (`ANCLORA_TALENT_TEST_MANUSCRIPT.docx`, `ANCLORA_TALENT_REFERENCE_STYLE.docx`, `ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf`).
- **Area**: `src/lib/test-fixtures/compilation-corpus.ts`
- **Implementation**: Write automated fixture loader that verifies file presence and exposes raw buffers for integration tests.
- **Dependencies**: None.
- **Acceptance**: Unit tests can import test pack buffers without mock corruption.
- **Parallel Safe**: `true`

---

### PHASE 1 — Canonical Semantic Manuscript Importer & TOC Sanitization

#### P1-T01 — Isolate TOC Blocks from Manuscript Body in DOCX Importer
- **Objective**: Prevent Word Table of Contents entries from entering the manuscript chapter sequence.
- **Area**: `src/lib/projects/import-pipeline.ts`
- **Implementation**: Inspect Mammoth HTML output and Word paragraphs for TOC indicators (`TOC 1..3`, `Índice 1..3`, `class="toc-entry"`). Segment document stream into FrontMatter, TOC, and BodyBlocks. Store TOC metadata in `detectedOutline` but isolate blocks from `buildChaptersFromBlocks()`.
- **Dependencies**: P0-T01.
- **Acceptance**: Import of test manuscript produces 0 chapter cards derived from TOC lines.
- **Parallel Safe**: `false`

#### P1-T02 — Strip Trailing Tab Stops and Page Numbers from Heading Titles
- **Objective**: Ensure chapter titles never contain trailing page numbers (e.g. `"Capítulo 1. El coste invisible del ruido 4"`).
- **Area**: `src/lib/projects/import-pipeline.ts` (`cleanHeadingText`)
- **Implementation**: Enhance `cleanHeadingText` with regex cleaning to strip trailing tab leaders, dots, dashes, and numeric digits: `replace(/[\t\s]+[·._\-—―]+\s*\d{1,4}\s*$/, '').replace(/[\t\s]+\d{1,4}\s*$/, '')`.
- **Dependencies**: P1-T01.
- **Acceptance**: Headings resolve to clean strings without trailing numbers; `"Introducción 3"` resolves to `"Introducción"`.
- **Parallel Safe**: `true`

#### P1-T03 — Multi-lingual Heading Style Mapping in DOCX Extractor
- **Objective**: Recognize Spanish and English standard Word heading styles during import.
- **Area**: `src/lib/projects/import-pipeline.ts` (`extractTextFromBuffer`)
- **Implementation**: Expand Mammoth `styleMap` to include Spanish headings: `"p[style-name='Título 1'] => h1:fresh"`, `"p[style-name='Título 2'] => h2:fresh"`, `"p[style-name='Título 3'] => h3:fresh"`, `"p[style-name='Encabezado 1'] => h1:fresh"`.
- **Dependencies**: P1-T01.
- **Acceptance**: Spanish Word documents map headings to `h1`, `h2`, `h3` tags rather than generic `<p>` tags.
- **Parallel Safe**: `true`

---

### PHASE 2 — Comprehensive Reference Style Extractor

#### P2-T01 — Expand Reference DOCX Style Extractor
- **Objective**: Extract complete typographic and layout rules from reference DOCX beyond body font.
- **Area**: `src/lib/reference-editorial-profile/docx.ts`
- **Implementation**: Parse `word/styles.xml` and `word/document.xml` for `Heading1` through `Heading4`, `Title`, `Subtitle`, `Quote`, `ListBullet`, `ListNumber`, page geometry, margins, and line spacing. Populate `ReferenceEditorialProfile`.
- **Dependencies**: P0-T01.
- **Acceptance**: Reference DOCX extracts full heading font families, font sizes, weights, and paragraph spacing before/after.
- **Parallel Safe**: `true`

#### P2-T02 — Normalize and Map Reference Fonts to Google Fonts Registry
- **Objective**: Ensure extracted font families resolve to loadable web fonts or safe system fallbacks.
- **Area**: `src/lib/reference-editorial-profile/font-normalization.ts`
- **Implementation**: Enhance `resolveEditorialFont` to map common desktop editorial fonts (e.g., Minion Pro, Garamond Premier, Palatino) to accessible Google Fonts equivalents (EB Garamond, Cormorant Garamond, Noto Serif).
- **Dependencies**: P2-T01.
- **Acceptance**: `resolvedFontFamily` contains a valid, loadable web font string.
- **Parallel Safe**: `true`

---

### PHASE 3 — Brand Profile Token Integration

#### P3-T01 — Map Brand Tokens to Canonical Semantic Style Roles
- **Objective**: Standardize brand color roles into usable editorial CSS tokens.
- **Area**: `src/lib/brand/brand-template-overrides.ts`
- **Implementation**: Ensure `BrandProfile` maps cleanly to: `ink` $\rightarrow$ text & primary headings, `paper` $\rightarrow$ page background, `accent` $\rightarrow$ decorative rules & quote borders, `displayFontFamily` $\rightarrow$ chapter titles, `bodyFontFamily` $\rightarrow$ prose.
- **Dependencies**: P0-T01.
- **Acceptance**: `brandProfileToTemplateOverrides` emits a complete token dictionary with 100% test coverage.
- **Parallel Safe**: `true`

---

### PHASE 4 — Deterministic Style Cascade & Resolver Engine

#### P4-T01 — Implement Canonical Style Cascade Resolver
- **Objective**: Build pure function `resolveDocumentStyles()` implementing the exact 5-level precedence hierarchy.
- **Area**: `src/lib/style-engine/cascade-resolver.ts`
- **Implementation**: Pure function accepting `(manuscriptStyles, referenceProfile, brandProfile, userOverrides)`. Resolves each role (`body`, `h1..h4`, `quote`, `table`, `footer`) deterministically into `ResolvedTextStyle`.
- **Dependencies**: P2-T01, P3-T01.
- **Acceptance**: Reference typography + Brand colors blend without destroying reference font sizes or layout rules.
- **Parallel Safe**: `false`

---

### PHASE 5 — Document Style Compiler & CSS Variable Generator

#### P5-T01 — Implement Document Style Compiler
- **Objective**: Compile `SemanticDocument` and resolved styles into `CompiledDocument`.
- **Area**: `src/lib/style-engine/document-compiler.ts`
- **Implementation**: Construct `compileDocument()` which outputs `CompiledDocument` containing the `SemanticDocument`, `DocumentStyleMap`, and serialized `cssVariables`.
- **Dependencies**: P4-T01.
- **Acceptance**: Emits valid dictionary of CSS variables (e.g. `--talent-body-font`, `--talent-h1-size`) matching resolved styles.
- **Parallel Safe**: `false`

---

### PHASE 6 — Chapter Editor Visual Integration & Live Toolbar

#### P6-T01 — Inject Compiled CSS Variables into Chapter Editor Shell
- **Objective**: Ensure the Chapter Editor visually renders compiled typography, colors, and line metrics.
- **Area**: `src/components/projects/advanced-chapter-editor/ChapterEditorFullscreen.tsx`, `AdvancedRichTextEditor.tsx`
- **Implementation**: Apply `style={compiledCssVariables}` to editor container. Replace hardcoded Tailwind prose font classes with CSS variable references (`fontFamily: 'var(--talent-body-font)'`).
- **Dependencies**: P5-T01.
- **Acceptance**: Chapter Editor renders text with resolved reference font and brand colors.
- **Parallel Safe**: `false`

#### P6-T02 — Connect Editor Toolbar to Effective Resolved Font Values
- **Objective**: Make the font picker toolbar report the true active font family instead of `'Liberation Serif'`.
- **Area**: `src/components/projects/AdvancedRichTextEditor.tsx` (`AdvancedFontSelector`)
- **Implementation**: Read current block node type from Tiptap editor. Look up resolved font in `DocumentStyleMap`. Display true resolved font family (e.g., `"Noto Serif"`).
- **Dependencies**: P6-T01.
- **Acceptance**: Toolbar displays `"Noto Serif"` when cursor is in body text, and `"Cinzel"` when cursor is in H1.
- **Parallel Safe**: `true`

---

### PHASE 7 — Chapters Screen & Preview Engine Integration

#### P7-T01 — Wire Chapters Screen Cards to Compiled Heading Styles
- **Objective**: Display chapter titles on the Chapters screen using compiled styles.
- **Area**: `src/components/projects/ChapterOrganizer.tsx`, `ProjectWorkspace.tsx`
- **Implementation**: Pass `compiledDocument.styleMap` to `ChapterOrganizer`. Render chapter card titles with resolved heading font and sanitized titles.
- **Dependencies**: P5-T01.
- **Acceptance**: Chapter organizer cards reflect compiled typography; titles are free of page numbers.
- **Parallel Safe**: `true`

#### P7-T02 — Unify Preview Engine with Document Style Map
- **Objective**: Ensure Live Preview renders identically to the Chapter Editor and exports.
- **Area**: `src/lib/compose/preview-adapter.ts`, `src/components/projects/PreviewModal.tsx`
- **Implementation**: Update `composeProjectPreview` to pass full `DocumentStyleMap` to the page renderer and measurer.
- **Dependencies**: P5-T01.
- **Acceptance**: Preview canvas visually matches the Chapter Editor typography and layout.
- **Parallel Safe**: `true`

---

### PHASE 8 — Export Pipeline Style Unification

#### P8-T01 — Integrate Document Style Map into PDF Export Builder
- **Objective**: Apply compiled styles to generated PDF deliverables.
- **Area**: `src/lib/projects/export-builder.tsx` (`buildProjectPdfWithConfig`)
- **Implementation**: Map `DocumentStyleMap` into `@react-pdf/renderer` `StyleSheet.create({ body: { fontFamily, fontSize, color }, h1: { ... } })`.
- **Dependencies**: P5-T01.
- **Acceptance**: PDF export matches reference document typography, heading scale, and brand colors.
- **Parallel Safe**: `true`

#### P8-T02 — Integrate Document Style Map into DOCX, EPUB, and HTML Exports
- **Objective**: Apply compiled styles to DOCX, EPUB, and HTML exports.
- **Area**: `src/lib/projects/export-builder.tsx`, `src/lib/epub/epub-writer.ts`
- **Implementation**: Inject resolved font families, heading scales, and brand palette into DOCX XML runs, EPUB stylesheet, and HTML export templates.
- **Dependencies**: P5-T01.
- **Acceptance**: DOCX and EPUB downloads reflect compiled styling.
- **Parallel Safe**: `true`

---

### PHASE 9 — Non-Destructive Reapplication & User Overrides UX

#### P9-T01 — Implement Non-Destructive Reference Reapplication Action
- **Objective**: Allow users to swap or update the reference document without altering manuscript text.
- **Area**: `src/lib/reference-editorial-profile/actions.ts`, `src/components/projects/EditorialStyleSection.tsx`
- **Implementation**: Create `reapplyReferenceStyleAction(projectId, referenceProfileId)`. Updates `project_documents.metadata.referenceEditorialProfile` and recompiles styles. Manuscript blocks remain untouched.
- **Dependencies**: P5-T01.
- **Acceptance**: User changes reference DOCX; manuscript content and manual edits are 100% preserved.
- **Parallel Safe**: `false`

#### P9-T02 — Implement User Style Overrides Inspector & Reset Controls
- **Objective**: Provide granular controls to override or reset specific role styles.
- **Area**: `src/components/projects/EditorialStyleSection.tsx`
- **Implementation**: Add inspector panel allowing users to adjust font size, family, or color for specific roles, with `[Reset to Reference]` button.
- **Dependencies**: P9-T01.
- **Acceptance**: User overrides take precedence; clicking reset restores reference styling.
- **Parallel Safe**: `true`

---

### PHASE 10 — Backward Compatibility & Legacy Project Hydration

#### P10-T01 — Legacy Project Fallback & Safe Hydration
- **Objective**: Ensure older projects lacking reference profiles or brand profiles continue rendering seamlessly.
- **Area**: `src/lib/style-engine/document-compiler.ts`
- **Implementation**: When `referenceEditorialProfile` is missing, `resolveDocumentStyles` falls back to `composition` settings and Talent defaults (`SYSTEM_COMPOSITION_DEFAULTS`).
- **Dependencies**: P5-T01.
- **Acceptance**: Existing projects open and edit without errors or visual regressions.
- **Parallel Safe**: `true`

---

### PHASE 11 — End-to-End Test Pack Verification & Release Gate

#### P11-T01 — Automated End-to-End Pipeline Verification Test
- **Objective**: Verify full compilation pipeline against the canonical test pack.
- **Area**: `src/lib/style-engine/compilation-pipeline.e2e.test.ts`
- **Implementation**: Automated test that feeds `ANCLORA_TALENT_TEST_MANUSCRIPT.docx`, `ANCLORA_TALENT_REFERENCE_STYLE.docx`, and `ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf` through the pipeline and validates AST, titles, style map, and exports.
- **Dependencies**: P1-T01 through P10-T01.
- **Acceptance**: All 13 acceptance scenario criteria pass completely.
- **Parallel Safe**: `false`

---

## 26. DEPENDENCY GRAPH

```text
Phase 0 (Fixtures)
   │
   ├──────────────────────────────┬──────────────────────────────┐
   ▼                              ▼                              ▼
Phase 1 (Semantic Importer)   Phase 2 (Reference Extractor)   Phase 3 (Brand Profile)
[P1-T01, P1-T02, P1-T03]      [P2-T01, P2-T02]                [P3-T01]
   │                              │                              │
   └──────────────────────────────┼──────────────────────────────┘
                                  │
                                  ▼
                      Phase 4: Cascade Resolver [P4-T01]
                                  │
                                  ▼
                      Phase 5: Document Compiler [P5-T01]
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
Phase 6: Editor          Phase 7: Chapters &       Phase 8: Exports
[P6-T01, P6-T02]         Preview [P7-T01, P7-T02]  [P8-T01, P8-T02]
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                      Phase 9: Reapplication & Overrides [P9-T01, P9-T02]
                                  │
                                  ▼
                      Phase 10: Backward Compatibility [P10-T01]
                                  │
                                  ▼
                      Phase 11: Release Verification [P11-T01]
```

---

## 27. DEFINITION OF DONE PER PHASE

- **Phase 0 Done When**: Test pack fixtures are loadable in automated tests without filesystem or binary errors.
- **Phase 1 Done When**: Test manuscript imports with zero TOC entries as chapters and zero trailing page numbers in chapter titles.
- **Phase 2 Done When**: Reference DOCX extracts full heading hierarchy, margins, and body typography into typed `ReferenceEditorialProfile`.
- **Phase 3 Done When**: Brand PDF produces normalized semantic tokens (`ink`, `paper`, `accent`, `displayFontFamily`, `bodyFontFamily`).
- **Phase 4 Done When**: `resolveDocumentStyles` computes deterministic resolved styles following the 5-tier precedence contract.
- **Phase 5 Done When**: `compileDocument` generates `CompiledDocument` with valid CSS variables dictionary in $< 20\text{ ms}$.
- **Phase 6 Done When**: Chapter Editor renders with compiled typography and toolbar displays accurate effective font names.
- **Phase 7 Done When**: Chapters screen and Live Preview match editor styling and pagination rules.
- **Phase 8 Done When**: PDF, DOCX, EPUB, and HTML exports reflect the unified `DocumentStyleMap`.
- **Phase 9 Done When**: Reference document can be swapped without losing manuscript edits, and local overrides survive reapplication.
- **Phase 10 Done When**: Projects created prior to this pipeline hydrate cleanly with legacy defaults.
- **Phase 11 Done When**: Full test pack acceptance scenario passes all 13 verification criteria.

---

## 28. SPEC-WIDE DEFINITION OF DONE

- [ ] DOCX manuscript produces correct semantic structure without content flattening.
- [ ] TOC page numbers never become chapter-title content.
- [ ] TOC is semantically separated and regenerated dynamically based on Talent pagination.
- [ ] Reference DOCX extracts into structured `EditorialStyleProfile`.
- [ ] Brand source extracts into reusable structured `BrandProfile`.
- [ ] Deterministic style cascade resolves with strict precedence.
- [ ] Manual overrides have explicit priority over reference and brand rules.
- [ ] Canonical `CompiledDocument` exists as the single presentation source.
- [ ] Chapters screen uses compiled semantic content and typography.
- [ ] Chapter Editor renders compiled styles via CSS custom properties.
- [ ] Toolbar accurately reports effective resolved typography.
- [ ] Preview uses the exact same style pipeline as the editor.
- [ ] Supported exports (PDF, DOCX, EPUB, HTML) preserve compiled styling.
- [ ] Reference can be replaced/reapplied without content loss.
- [ ] Brand can be changed/reapplied without content loss.
- [ ] Manual content edits survive style recompilation.
- [ ] Existing projects without reference/brand continue working seamlessly.
- [ ] Fixed-PDF behavior remains completely separate and unchanged.

---

## 29. CANONICAL TEST PACK ACCEPTANCE SCENARIO

- **Input**:
  - `ANCLORA_TALENT_TEST_MANUSCRIPT.docx`
  - `ANCLORA_TALENT_REFERENCE_STYLE.docx`
  - `ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf`

- **Execution**:
  1. User creates a new project importing `ANCLORA_TALENT_TEST_MANUSCRIPT.docx`.
  2. User attaches `ANCLORA_TALENT_REFERENCE_STYLE.docx` as reference document.
  3. User attaches `ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf` as brand identity.

- **Verification Criteria**:
  1. Chapter list contains genuine chapters only (no TOC lines).
  2. Titles `"Introducción"` and `"Capítulo 1. El coste invisible del ruido"` contain no trailing page digits (`3`, `4`).
  3. Manuscript prose and formatting (tables, lists, footnotes) are 100% preserved.
  4. Page trim and margins match the reference document.
  5. Heading scale and font families derive from the reference document.
  6. Brand ink color is applied to headings/text; brand accent color is applied to quotes and rules.
  7. Chapter Editor toolbar displays effective resolved font (e.g. `"Noto Serif"`).
  8. Editor canvas displays compiled typography and line spacing.
  9. Live Preview matches the editor layout and pagination.
  10. PDF and DOCX exports reproduce the compiled typography and brand colors.
  11. User swaps reference document for a different template: styling updates immediately, manuscript content is unchanged.
  12. User updates brand profile: colors update immediately, manuscript content is unchanged.
  13. User sets an explicit override on Chapter 1 title: override persists after reference reapplication.

---

## 30. OUT OF SCOPE

- Full arbitrary Microsoft Word macro / VBA execution or ShapeArt fidelity.
- Arbitrary InDesign-level multi-column variable text frame linking.
- Optical Character Recognition (OCR) redesign (covered under existing FileStudio integration).
- Fixed PDF source binary modification.
- Real-time multi-cursor collaborative editing redesign.
- User authentication or subscription plan changes.
- Database schema migration altering relational core tables.

---

## 31. OPEN DECISIONS

| Question | Recommended Default | Architectural Rationale | Blocking Phase |
| :--- | :--- | :--- | :--- |
| **Q1: Footnote representation in AST** | Keep footnotes as inline marks/attachments in paragraph AST rather than dedicated top-level blocks. | Prevents breaking paragraph flow; matches Tiptap inline footnote extensions and EPUB note standards. | Phase 1 |
| **Q2: Database storage for reference profiles** | Store project-specific reference profile in `project_documents.metadata.referenceEditorialProfile` (JSONB), and user library templates in `structure_profiles.schema`. | Avoids running a schema migration (`NO_SCHEMA_CHANGE`), matching the existing architectural contract in `PRODUCTION_RUNTIME.md`. | Phase 2 / Phase 5 |
| **Q3: Dynamic Google Font loading in Editor** | Pre-load resolved font via `WebFont.load()` or `@next/font` hook when `CompiledDocument` changes. | Eliminates flash of unstyled text (FOUT) in Chapter Editor when custom reference fonts are applied. | Phase 6 |
