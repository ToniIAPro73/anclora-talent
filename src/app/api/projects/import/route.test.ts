import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const getCurrentUserMock = vi.fn();
const buildImportOcrRunnerMock = vi.fn();
const extractImportedDocumentSeedMock = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock('@/lib/filestudio/ocr', () => ({
  buildImportOcrRunner: buildImportOcrRunnerMock,
}));

vi.mock('@/lib/projects/import', () => ({
  extractImportedDocumentSeed: extractImportedDocumentSeedMock,
}));

function buildRequest(fileName = 'escaneado.pdf', mimeType = 'application/pdf') {
  const formData = new FormData();
  formData.append('sourceDocument', new File([new Uint8Array([1, 2, 3])], fileName, { type: mimeType }));
  // The route only reads request.formData(); jsdom's NextRequest cannot parse
  // multipart bodies, so the request is stubbed at that seam.
  return { formData: async () => formData } as unknown as NextRequest;
}

function seed(ocrAppliedMode: 'local' | 'service' | null = null) {
  return {
    title: 'Título',
    subtitle: 'Sub',
    author: 'Autora',
    chapters: [{ title: 'Capítulo 1' }],
    warnings: [],
    sourceFileName: 'escaneado.pdf',
    ocrAppliedMode,
  };
}

describe('POST /api/projects/import (F2 OCR de ingesta)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 'user-1' });
  });

  test('FileStudio configured: the OCR runner is built and the mode is declared in the response', async () => {
    const runner = vi.fn();
    buildImportOcrRunnerMock.mockResolvedValue(runner);
    extractImportedDocumentSeedMock.mockResolvedValue(seed('service'));

    const { POST } = await import('./route');
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(buildImportOcrRunnerMock).toHaveBeenCalledWith('user-1');
    expect(extractImportedDocumentSeedMock).toHaveBeenCalledWith(expect.any(File), { ocr: runner });
    expect(body.ocrAppliedMode).toBe('service');
  });

  test('FileStudio not configured: no runner, import behaves as before', async () => {
    buildImportOcrRunnerMock.mockResolvedValue(undefined);
    extractImportedDocumentSeedMock.mockResolvedValue(seed(null));

    const { POST } = await import('./route');
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(extractImportedDocumentSeedMock).toHaveBeenCalledWith(expect.any(File), { ocr: undefined });
    expect(body.ocrAppliedMode).toBeNull();
    expect(body.title).toBe('Título');
  });

  test('import failures keep the 422 contract', async () => {
    buildImportOcrRunnerMock.mockResolvedValue(undefined);
    extractImportedDocumentSeedMock.mockRejectedValue(new Error('Imported document is empty'));

    const { POST } = await import('./route');
    const response = await POST(buildRequest());

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('IMPORT_FAILED');
  });

  test('unsupported formats are rejected before any OCR work', async () => {
    const { POST } = await import('./route');
    const response = await POST(buildRequest('video.mp4', 'video/mp4'));

    expect(response.status).toBe(422);
    expect(buildImportOcrRunnerMock).not.toHaveBeenCalled();
    expect(extractImportedDocumentSeedMock).not.toHaveBeenCalled();
  });
});
