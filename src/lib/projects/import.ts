import 'server-only';
export { supportedImportAccept } from './import-config';
import { buildImportedDocumentSeed, extractTextFromBuffer, isScannedPdfSource, normalizeText } from './import-pipeline';

export { buildImportedDocumentSeed } from './import-pipeline';

/**
 * OCR runner injected by the import route when FileStudio is configured
 * (F2). Receives the raw PDF bytes of a scanned source and returns the
 * recognized text plus the declared processing mode; null keeps the current
 * import behavior untouched.
 */
export type ImportOcrRunner = (input: {
  fileName: string;
  bytes: Buffer;
  pageCount?: number;
}) => Promise<{ text: string; mode: 'local' | 'service' } | null>;

export async function extractImportedDocumentSeed(
  file: File,
  options: { ocr?: ImportOcrRunner; manuscriptTypeOverride?: import('./types').ManuscriptType } = {},
) {
  const fileName = file.name || 'documento-importado';
  const mimeType = file.type || 'application/octet-stream';
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // U4: a parser failure (corrupt docx/pdf, mammoth/pdf-parse error) must
  // never abort the import. Degrade to an empty shell document and flag the
  // seed so callers can show a non-blocking warning.
  let extractedSource: Awaited<ReturnType<typeof extractTextFromBuffer>>;
  let parseFailed = false;
  try {
    extractedSource = await extractTextFromBuffer(fileName, mimeType, buffer);
  } catch (error) {
    console.error('[import] source parse failed; continuing with an empty document', {
      fileName,
      mimeType,
      error,
    });
    extractedSource = { text: '', html: null, pageCount: undefined };
    parseFailed = true;
  }

  let normalized = normalizeText(extractedSource.text);
  let ocrAppliedMode: 'local' | 'service' | null = null;

  // F2 OCR de ingesta: scanned/image-only PDF + FileStudio configured → the
  // OCR text feeds the premium pipeline. Anything else keeps today's flow.
  if (
    options.ocr &&
    isScannedPdfSource({ fileName, mimeType, text: extractedSource.text })
  ) {
    const ocrResult = await options.ocr({
      fileName,
      bytes: buffer,
      pageCount: extractedSource.pageCount,
    });
    const ocrText = ocrResult ? normalizeText(ocrResult.text) : '';
    if (ocrResult && ocrText.length > normalized.length) {
      normalized = ocrText;
      ocrAppliedMode = ocrResult.mode;
      // OCR recovered the content the parser could not read.
      parseFailed = false;
    }
  }

  if (!normalized) {
    if (!parseFailed) {
      throw new Error('Imported document is empty');
    }
    // Empty shell document: the project is still created (titled after the
    // file) and the user starts from a blank manuscript.
    normalized = ' ';
  }

  const seed = buildImportedDocumentSeed({
    fileName,
    mimeType,
    text: normalized,
    html: extractedSource.html,
    sourcePageCount: extractedSource.pageCount,
    manuscriptTypeOverride: options.manuscriptTypeOverride,
  });

  return { ...seed, ocrAppliedMode, parseFailed };
}
