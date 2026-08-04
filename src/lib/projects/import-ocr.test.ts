import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isScannedPdfSource, SCANNED_PDF_MIN_TEXT_CHARS } from './import-pipeline';

describe('isScannedPdfSource', () => {
  test('a PDF with ~empty extracted text is an OCR candidate', () => {
    expect(
      isScannedPdfSource({ fileName: 'escaneado.pdf', mimeType: 'application/pdf', text: '  \n ' }),
    ).toBe(true);
    expect(
      isScannedPdfSource({ fileName: 'escaneado.pdf', mimeType: 'application/pdf', text: 'Pág. 1' }),
    ).toBe(true);
  });

  test('a PDF with a real text layer is not an OCR candidate', () => {
    const text = 'Contenido real del documento. '.repeat(20);
    expect(isScannedPdfSource({ fileName: 'libro.pdf', mimeType: 'application/pdf', text })).toBe(false);
    expect(text.length).toBeGreaterThan(SCANNED_PDF_MIN_TEXT_CHARS);
  });

  test('non-PDF sources are never OCR candidates', () => {
    expect(isScannedPdfSource({ fileName: 'notas.txt', mimeType: 'text/plain', text: '' })).toBe(false);
    expect(
      isScannedPdfSource({
        fileName: 'doc.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        text: '',
      }),
    ).toBe(false);
  });
});

describe('extractImportedDocumentSeed with OCR (F2 ingesta)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function mockPdfParse(text: string, numpages = 3) {
    vi.doMock('server-only', () => ({}));
    vi.doMock('pdf-parse', () => ({
      PDFParse: class {
        getText = vi.fn(async () => ({ text, numpages }));
        destroy = vi.fn(async () => {});
      },
    }));
  }

  function scannedFile() {
    return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'escaneado.pdf', {
      type: 'application/pdf',
    });
  }

  test('scanned PDF + OCR runner: the recognized text feeds the premium pipeline', async () => {
    mockPdfParse('');
    const { extractImportedDocumentSeed } = await import('./import');

    const ocr = vi.fn(async (input: { fileName: string; bytes: Buffer; pageCount?: number }) => ({
      text: `Título OCR\n\nCapítulo 1\n\nEl texto reconocido por Tesseract alimenta el pipeline de ${input.fileName}.`,
      mode: 'service' as const,
    }));

    const seed = await extractImportedDocumentSeed(scannedFile(), { ocr });

    expect(ocr).toHaveBeenCalledTimes(1);
    expect(ocr.mock.calls[0][0]).toMatchObject({ fileName: 'escaneado.pdf', pageCount: 3 });
    expect(seed.ocrAppliedMode).toBe('service');
    expect(seed.title).toBe('Título OCR');
    expect(seed.chapters?.length).toBeGreaterThan(0);
  });

  test('scanned PDF without FileStudio: current behavior intact (empty import error)', async () => {
    mockPdfParse('');
    const { extractImportedDocumentSeed } = await import('./import');

    await expect(extractImportedDocumentSeed(scannedFile())).rejects.toThrow(
      'Imported document is empty',
    );
  });

  test('scanned PDF + failing OCR runner: falls back to the current behavior', async () => {
    mockPdfParse('');
    const { extractImportedDocumentSeed } = await import('./import');

    const ocr = vi.fn(async () => null);
    await expect(extractImportedDocumentSeed(scannedFile(), { ocr })).rejects.toThrow(
      'Imported document is empty',
    );
    expect(ocr).toHaveBeenCalledTimes(1);
  });

  test('PDF with a real text layer never invokes the OCR runner', async () => {
    mockPdfParse('Mi Documento Real\n\n' + 'Contenido textual completo del PDF. '.repeat(8));
    const { extractImportedDocumentSeed } = await import('./import');

    const ocr = vi.fn(async () => ({ text: 'no debería usarse', mode: 'service' as const }));
    const seed = await extractImportedDocumentSeed(scannedFile(), { ocr });

    expect(ocr).not.toHaveBeenCalled();
    expect(seed.ocrAppliedMode).toBeNull();
    expect(seed.title).toBe('Mi Documento Real');
  });

  test('OCR shorter than the extracted text does not replace it', async () => {
    const realText = 'Capítulo 1\n\n' + 'Texto de la capa textual. '.repeat(2);
    mockPdfParse(realText);
    const { extractImportedDocumentSeed } = await import('./import');

    // Text just under the heuristic threshold, OCR returns even less.
    const ocr = vi.fn(async () => ({ text: 'x', mode: 'service' as const }));
    const seed = await extractImportedDocumentSeed(scannedFile(), { ocr });

    expect(seed.ocrAppliedMode).toBeNull();
    expect(seed.title).toBe('Capítulo 1');
  });
});
