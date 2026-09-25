import type { SemanticDocument } from '@/lib/document/model';
import type { ReferenceEditorialProfile } from '@/lib/reference-editorial-profile/model';
import type { BrandProfile } from '@/lib/brand/brand-profile';
import { resolveDocumentStyles } from './cascade-resolver';
import type { CompiledDocument, DocumentStyleMap, UserStyleOverride } from './model';

export interface CompileDocumentOptions {
  projectId: string;
  document: SemanticDocument;
  referenceProfile?: ReferenceEditorialProfile | null;
  brandProfile?: BrandProfile | null;
  userOverrides?: UserStyleOverride[];
}

export function generateCssVariables(styleMap: DocumentStyleMap): Record<string, string> {
  const vars: Record<string, string> = {
    // Page Geometry
    '--talent-page-width': `${styleMap.page.widthPt}pt`,
    '--talent-page-height': `${styleMap.page.heightPt}pt`,
    '--talent-page-margin-top': `${styleMap.page.marginsPt.top}pt`,
    '--talent-page-margin-bottom': `${styleMap.page.marginsPt.bottom}pt`,
    '--talent-page-margin-left': `${styleMap.page.marginsPt.left}pt`,
    '--talent-page-margin-right': `${styleMap.page.marginsPt.right}pt`,

    // Body
    '--talent-body-font': styleMap.body.fontFamily,
    '--talent-body-size': `${styleMap.body.fontSizePt}pt`,
    '--talent-body-color': styleMap.body.color,
    '--talent-body-line-height': `${styleMap.body.lineHeight}`,
    '--talent-body-align': styleMap.body.textAlign,
    '--talent-body-indent': `${styleMap.body.firstLineIndentPt ?? 0}pt`,
    '--talent-body-spacing-after': `${styleMap.body.spacingAfterPt ?? 0}pt`,

    // Headings
    '--talent-h1-font': styleMap.headings.h1.fontFamily,
    '--talent-h1-size': `${styleMap.headings.h1.fontSizePt}pt`,
    '--talent-h1-color': styleMap.headings.h1.color,
    '--talent-h1-weight': styleMap.headings.h1.fontWeight,
    '--talent-h1-line-height': `${styleMap.headings.h1.lineHeight}`,
    '--talent-h1-align': styleMap.headings.h1.textAlign,
    '--talent-h1-spacing-before': `${styleMap.headings.h1.spacingBeforePt ?? 0}pt`,
    '--talent-h1-spacing-after': `${styleMap.headings.h1.spacingAfterPt ?? 0}pt`,

    '--talent-h2-font': styleMap.headings.h2.fontFamily,
    '--talent-h2-size': `${styleMap.headings.h2.fontSizePt}pt`,
    '--talent-h2-color': styleMap.headings.h2.color,
    '--talent-h2-weight': styleMap.headings.h2.fontWeight,
    '--talent-h2-line-height': `${styleMap.headings.h2.lineHeight}`,
    '--talent-h2-align': styleMap.headings.h2.textAlign,
    '--talent-h2-spacing-before': `${styleMap.headings.h2.spacingBeforePt ?? 0}pt`,
    '--talent-h2-spacing-after': `${styleMap.headings.h2.spacingAfterPt ?? 0}pt`,

    '--talent-h3-font': styleMap.headings.h3.fontFamily,
    '--talent-h3-size': `${styleMap.headings.h3.fontSizePt}pt`,
    '--talent-h3-color': styleMap.headings.h3.color,
    '--talent-h3-weight': styleMap.headings.h3.fontWeight,
    '--talent-h3-line-height': `${styleMap.headings.h3.lineHeight}`,
    '--talent-h3-align': styleMap.headings.h3.textAlign,
    '--talent-h3-spacing-before': `${styleMap.headings.h3.spacingBeforePt ?? 0}pt`,
    '--talent-h3-spacing-after': `${styleMap.headings.h3.spacingAfterPt ?? 0}pt`,

    '--talent-h4-font': styleMap.headings.h4.fontFamily,
    '--talent-h4-size': `${styleMap.headings.h4.fontSizePt}pt`,
    '--talent-h4-color': styleMap.headings.h4.color,
    '--talent-h4-weight': styleMap.headings.h4.fontWeight,
    '--talent-h4-line-height': `${styleMap.headings.h4.lineHeight}`,
    '--talent-h4-align': styleMap.headings.h4.textAlign,
    '--talent-h4-spacing-before': `${styleMap.headings.h4.spacingBeforePt ?? 0}pt`,
    '--talent-h4-spacing-after': `${styleMap.headings.h4.spacingAfterPt ?? 0}pt`,

    // Quotes
    '--talent-quote-font': styleMap.quote.fontFamily,
    '--talent-quote-size': `${styleMap.quote.fontSizePt}pt`,
    '--talent-quote-color': styleMap.quote.color,
    '--talent-quote-border-color': styleMap.quote.borderLeftColor,
    '--talent-quote-border-width': `${styleMap.quote.borderLeftWidthPt}pt`,

    // Lists
    '--talent-list-item-spacing': `${styleMap.list.itemSpacingPt}pt`,
    '--talent-list-marker-color': styleMap.list.markerColor ?? styleMap.body.color,

    // Tables
    '--talent-table-border-color': styleMap.table.borderColor,
    '--talent-table-header-bg': styleMap.table.header.backgroundColor,

    // Footnotes
    '--talent-footnote-size': `${styleMap.footnote.fontSizePt}pt`,
    '--talent-footnote-color': styleMap.footnote.color,

    // Global Accent & Dividers
    '--talent-accent-color': styleMap.decorations.accentColor,
    '--talent-divider-color': styleMap.decorations.dividerColor,
  };

  return vars;
}

export function compileDocument({
  projectId,
  document,
  referenceProfile,
  brandProfile,
  userOverrides = [],
}: CompileDocumentOptions): CompiledDocument {
  const styleMap = resolveDocumentStyles({
    referenceProfile,
    brandProfile,
    userOverrides,
  });

  const cssVariables = generateCssVariables(styleMap);

  return {
    version: 1,
    projectId,
    document,
    styleMap,
    cssVariables,
    bindings: {
      referenceProfileId: referenceProfile?.source.sourceAssetId ?? undefined,
      referenceSourceHash: referenceProfile?.source.hash ?? undefined,
      brandProfileId: brandProfile?.id,
      brandVersion: brandProfile ? 1 : undefined,
      overridesCount: userOverrides.length,
    },
    compiledAt: new Date().toISOString(),
  };
}
