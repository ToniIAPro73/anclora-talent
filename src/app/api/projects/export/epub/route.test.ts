import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const requireUserIdMock = vi.fn();
const getProjectByIdMock = vi.fn();
const composeProjectPreviewMock = vi.fn();
const buildEpubMock = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  requireUserId: requireUserIdMock,
}));

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: { getProjectById: getProjectByIdMock },
}));

vi.mock('@/lib/compose/preview-adapter', () => ({
  composeProjectPreview: composeProjectPreviewMock,
}));

vi.mock('@/lib/epub', () => ({
  buildEpub: buildEpubMock,
}));

const VIOLATION = { page: 2, blockId: 'b1', rule: 'keepTogether.table', message: 'Tabla partida' };

function buildProject(exportGate: 'off' | 'warn' | 'block') {
  return {
    id: 'project-1',
    slug: 'libro-de-prueba',
    document: { rules: { exportGate } },
  };
}

function buildComposed(violations: unknown[]) {
  return { result: { violations } };
}

function buildRequest() {
  return new NextRequest('https://example.com/api/projects/export/epub?projectId=project-1');
}

describe('GET /api/projects/export/epub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserIdMock.mockResolvedValue('user-1');
    buildEpubMock.mockResolvedValue(Buffer.from('epub-bytes'));
  });

  test('returns 404 when the project does not exist', async () => {
    getProjectByIdMock.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(404);
    expect(buildEpubMock).not.toHaveBeenCalled();
  });

  test('gate block + violations → 409 with the violation payload', async () => {
    getProjectByIdMock.mockResolvedValue(buildProject('block'));
    composeProjectPreviewMock.mockReturnValue(buildComposed([VIOLATION]));

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Export blocked by document violations',
      violations: [VIOLATION],
    });
    expect(buildEpubMock).not.toHaveBeenCalled();
  });

  test('gate warn + violations → 200 with the x-anclora-gate header', async () => {
    getProjectByIdMock.mockResolvedValue(buildProject('warn'));
    composeProjectPreviewMock.mockReturnValue(buildComposed([VIOLATION]));

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('x-anclora-gate')).toBe('warn');
    expect(response.headers.get('content-type')).toBe('application/epub+zip');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="libro-de-prueba.epub"',
    );
    expect(buildEpubMock).toHaveBeenCalledTimes(1);
  });

  test('gate off + violations → 200 without the gate header', async () => {
    getProjectByIdMock.mockResolvedValue(buildProject('off'));
    composeProjectPreviewMock.mockReturnValue(buildComposed([VIOLATION]));

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('x-anclora-gate')).toBeNull();
    expect(buildEpubMock).toHaveBeenCalledTimes(1);
  });

  test('gate block without violations → 200', async () => {
    getProjectByIdMock.mockResolvedValue(buildProject('block'));
    composeProjectPreviewMock.mockReturnValue(buildComposed([]));

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('x-anclora-gate')).toBeNull();
    expect(buildEpubMock).toHaveBeenCalledTimes(1);
  });
});
