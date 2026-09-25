import type { ResolvedTextStyle } from '@/lib/style-engine/model';

export type PropertyProvenanceSource =
  | 'docx-styles'
  | 'docx-defaults'
  | 'docx-direct'
  | 'fallback'
  | 'user-override'
  | 'reference'
  | 'brand';

export interface PropertyProvenance {
  source: PropertyProvenanceSource;
  confidence: number;
  rawOoxmlValue?: string;
  extractionMethod?: string;
}

export interface OriginalDocumentStyleProfile {
  version: 1;
  sourceAssetId?: string;
  sourceHash?: string;
  parserVersion: string;
  /** Optional for hand-authored fixtures and legacy persisted profiles. */
  extractedAt?: string;

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

  /** Custom "Editorial Kicker" paragraph style (e.g. "INTRODUCCIÓN" labels). */
  kicker?: Partial<ResolvedTextStyle>;

  provenance?: Record<string, PropertyProvenance>;
}

export interface SourcePageAnchor {
  blockIndex: number;
  offset: number;
  blockId?: string;
}

export interface SourcePaginationPage {
  pageNumber: number;
  startAnchor: SourcePageAnchor;
  endAnchor: SourcePageAnchor;
  headerText?: string;
  footerText?: string;
}

export interface SourcePaginationBaseline {
  version: 1;
  sourceHash: string;
  canonicalContentHash: string;
  pageCount: number;
  exactness: 'proven_ooxml_breaks' | 'estimated_source_geometry';
  pages: SourcePaginationPage[];
  createdAt: string;
}
