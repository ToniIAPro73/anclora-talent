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

export const REFERENCE_PDF_ANALYSIS_TIMEOUT_MS = 15_000;

export class ReferenceAnalysisTimeoutError extends Error {
  readonly code = 'REFERENCE_ANALYSIS_TIMEOUT';
  constructor(timeoutMs: number) {
    super(`PDF editorial profile analysis timed out after ${timeoutMs}ms`);
    this.name = 'ReferenceAnalysisTimeoutError';
  }
}

/** Extracts PDF layout evidence with pdf.js. Text is retained only transiently. */
export async function extractEditorialProfileFromPdf(
  buffer: Buffer,
  source: PdfSourceInput,
  options?: { timeoutMs?: number; _pdfjs?: unknown },
): Promise<PdfEditorialAnalysis> {
  const timeoutMs = options?.timeoutMs ?? REFERENCE_PDF_ANALYSIS_TIMEOUT_MS;
  const pdfjs =
    (options?._pdfjs as typeof import('pdfjs-dist/legacy/build/pdf.mjs')) ||
    (await import('pdfjs-dist/legacy/build/pdf.mjs'));
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    stopAtErrors: true,
  });

  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        loadingTask.destroy();
      } catch {
        // ignore
      }
      reject(new ReferenceAnalysisTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  try {
    const document = await Promise.race([loadingTask.promise, timeoutPromise]);
    const fragments: EditorialTextFragment[] = [];
    let pageWidth = 0;
    let pageHeight = 0;
    const warnings: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const pageTask = (async () => {
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
      })();

      await Promise.race([pageTask, timeoutPromise]);
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
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    try {
      await loadingTask.destroy();
    } catch {
      // ignore
    }
  }
}
