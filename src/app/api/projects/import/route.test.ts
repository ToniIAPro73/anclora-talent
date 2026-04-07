import { beforeEach, describe, expect, test, vi } from 'vitest';

const authMock = vi.fn();
const extractImportedDocumentSeedMock = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/projects/import', () => ({
  extractImportedDocumentSeed: extractImportedDocumentSeedMock,
}));

function buildRequestWithFile(file?: File) {
  return {
    formData: vi.fn(async () => ({
      get: (key: string) => (key === 'sourceDocument' ? file ?? null : null),
    })),
  };
}

describe('POST /api/projects/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns 401 when user is not authenticated', async () => {
    authMock.mockResolvedValue({ userId: null });

    const { POST } = await import('./route');
    const response = await POST(buildRequestWithFile() as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    expect(extractImportedDocumentSeedMock).not.toHaveBeenCalled();
  });

  test('returns 400 when no file is provided', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });

    const { POST } = await import('./route');
    const response = await POST(buildRequestWithFile() as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'No file provided' });
  });

  test('returns 413 when file is too large', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });

    const oversized = new File(['x'], 'sample.pdf', { type: 'application/pdf' });
    Object.defineProperty(oversized, 'size', { value: 51 * 1024 * 1024 });

    const { POST } = await import('./route');
    const response = await POST(buildRequestWithFile(oversized) as never);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: 'FILE_TOO_LARGE' });
    expect(extractImportedDocumentSeedMock).not.toHaveBeenCalled();
  });

  test('returns 422 for unsupported extension', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });

    const unsupported = new File(['x'], 'sample.odt', { type: 'application/vnd.oasis.opendocument.text' });

    const { POST } = await import('./route');
    const response = await POST(buildRequestWithFile(unsupported) as never);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: 'FORMAT_UNSUPPORTED' });
    expect(extractImportedDocumentSeedMock).not.toHaveBeenCalled();
  });

  test('returns summarized analysis on successful import', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });
    extractImportedDocumentSeedMock.mockResolvedValue({
      title: 'NUNCA MÁS EN LA SOMBRA',
      subtitle: 'Subtítulo',
      author: 'Antonio Ballesteros Alonso',
      chapterTitle: 'Prólogo',
      blocks: [],
      chapters: [
        { title: 'Prólogo', blocks: [] },
        { title: 'Índice', blocks: [] },
        { title: 'Introducción', blocks: [] },
        { title: 'Fase 1', blocks: [] },
        { title: 'Fase 2', blocks: [] },
      ],
      warnings: ['No se detectó con certeza el autor; revísalo tras importar.'],
      sourceFileName: 'Nunca_mas_en_la_sombra.docx',
      sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const file = new File(['x'], 'Nunca_mas_en_la_sombra.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const { POST } = await import('./route');
    const response = await POST(buildRequestWithFile(file) as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.title).toBe('NUNCA MÁS EN LA SOMBRA');
    expect(data.author).toBe('Antonio Ballesteros Alonso');
    expect(data.chapterCount).toBe(5);
    expect(data.chapterTitles).toEqual(['Prólogo', 'Índice', 'Introducción', 'Fase 1']);
  });

  test('returns IMPORT_FAILED when parser throws', async () => {
    authMock.mockResolvedValue({ userId: 'user_123' });
    extractImportedDocumentSeedMock.mockRejectedValue(new Error('Parser failed unexpectedly'));

    const file = new File(['x'], 'sample.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const { POST } = await import('./route');
    const response = await POST(buildRequestWithFile(file) as never);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: 'IMPORT_FAILED',
      detail: 'Parser failed unexpectedly',
    });
  });
});
