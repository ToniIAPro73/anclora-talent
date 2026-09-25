import type { SemanticDocument } from '@/lib/document/model';

export type EditorialRole =
  | 'body'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'quote'
  | 'list'
  | 'table'
  | 'footnote'
  | 'header'
  | 'footer';

export interface ResolvedTextStyle {
  fontFamily: string;
  fontSizePt: number;
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  lineHeight: number;
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
  palette: {
    ink: string;
    paper: string;
    accent: string;
    accentMuted: string;
  };
}

export interface UserStyleOverride {
  scope: 'global' | 'role' | 'block';
  targetRole?: EditorialRole;
  targetBlockId?: string;
  styles: Partial<ResolvedTextStyle>;
  updatedAt: string;
}

export interface CompiledDocument {
  version: 1;
  projectId: string;
  document: SemanticDocument;
  styleMap: DocumentStyleMap;
  cssVariables: Record<string, string>;
  bindings: {
    referenceProfileId?: string;
    referenceSourceHash?: string;
    brandProfileId?: string;
    brandVersion?: number;
    overridesCount: number;
  };
  compiledAt: string;
}
