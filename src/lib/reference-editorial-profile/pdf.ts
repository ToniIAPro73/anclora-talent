import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { extractEditorialProfileFromFragments, type EditorialPageEvidence, type EditorialTextFragment } from './extract';
import type { ReferenceEditorialProfile } from './model';

export interface PdfEditorialAnalysis {
  profile: ReferenceEditorialProfile;
  analysis: {
    pagesAnalysed: number;
    pagesExcluded: number;
    fragmentCount: number;
    warnings: string[];
  };
}

interface PdfSourceInput {
  sourceAssetId?: string | null;
  filename: string;
  format: 'pdf';
  hash?: string | null;
}

function textItem(item: TextItem, pageNumber: number, pageHeight: number): EditorialTextFragment | null {
  const text = item.str.trim();
  if (!text) return null;
  const transform = item.transform;
  const height = Math.abs(item.height) || Math.abs(transform[3]) || 1;
  return {
    pageNumber,
    text,
    fontName: item.fontName ?? 'unknown',
    fontSize: Math.max(0.1, Math.abs(transform[3]) || height),
    fontWeight: 'unknown',
    italic: false,
    color: null,
    x: transform[4],
    y: pageHeight - transform[5] - height,
    width: Math.max(0, item.width),
    height,
  };
}

/** Extracts PDF layout evidence with pdf.js. Text is retained only transiently. */
export async function extractEditorialProfileFromPdf(
  buffer: Buffer,
  source: PdfSourceInput,
): Promise<PdfEditorialAnalysis> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const fragments: EditorialTextFragment[] = [];
  let pageWidth = 0;
  let pageHeight = 0;
  const warnings: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    pageWidth = pageWidth || viewport.width;
    pageHeight = pageHeight || viewport.height;
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ('str' in item && 'transform' in item) {
        const fragment = textItem(item as TextItem, pageNumber, viewport.height);
        if (fragment) fragments.push(fragment);
      }
    }
  }

  if (fragments.length === 0) warnings.push('No usable text layout was found in the PDF.');
  const page: EditorialPageEvidence = { width: pageWidth, height: pageHeight, unit: 'pt' };
  const profile = extractEditorialProfileFromFragments(page, fragments, {
    sourceAssetId: source.sourceAssetId,
    filename: source.filename,
    format: source.format,
    hash: source.hash,
  });
  return {
    profile,
    analysis: {
      pagesAnalysed: document.numPages,
      pagesExcluded: 0,
      fragmentCount: fragments.length,
      warnings,
    },
  };
}
