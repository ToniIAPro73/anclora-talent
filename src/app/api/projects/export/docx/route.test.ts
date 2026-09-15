import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const requireUserIdMock = vi.fn();
const getProjectByIdMock = vi.fn();
const buildProjectDocxBufferMock = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  requireUserId: requireUserIdMock,
}));

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: { getProjectById: getProjectByIdMock },
}));

vi.mock('@/lib/projects/export-builder', () => ({
  buildProjectDocxBuffer: buildProjectDocxBufferMock,
}));

function buildRequest(projectId: string) {
  return new NextRequest(`https://example.com/api/projects/export/docx?projectId=${projectId}`);
}

describe('GET /api/projects/export/docx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserIdMock.mockResolvedValue('user-1');
    buildProjectDocxBufferMock.mockResolvedValue(Buffer.from('docx-bytes'));
  });

  test('fixed-pdf project → 409, builder never invoked', async () => {
    getProjectByIdMock.mockResolvedValue({
      id: 'project-2',
      slug: 'el-plan-de-escape',
      document: { source: { mode: 'fixed-pdf' } },
    });

    const { GET } = await import('./route');
    const response = await GET(buildRequest('project-2'));

    expect(response.status).toBe(409);
    expect(buildProjectDocxBufferMock).not.toHaveBeenCalled();
  });

  test('regression: editable project still exports normally', async () => {
    getProjectByIdMock.mockResolvedValue({
      id: 'project-1',
      slug: 'manuscrito',
      document: { source: null },
    });

    const { GET } = await import('./route');
    const response = await GET(buildRequest('project-1'));

    expect(response.status).toBe(200);
    expect(buildProjectDocxBufferMock).toHaveBeenCalledTimes(1);
  });

  test('missing project → 404', async () => {
    getProjectByIdMock.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(buildRequest('missing'));

    expect(response.status).toBe(404);
  });
});
