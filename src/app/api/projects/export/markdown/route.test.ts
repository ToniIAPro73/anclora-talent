import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const requireUserIdMock = vi.fn();
const getProjectByIdMock = vi.fn();
const projectToSemanticDocumentMock = vi.fn();
const documentToMarkdownMock = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  requireUserId: requireUserIdMock,
}));

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: { getProjectById: getProjectByIdMock },
}));

vi.mock('@/lib/compose/preview-adapter', () => ({
  projectToSemanticDocument: projectToSemanticDocumentMock,
}));

vi.mock('@/lib/document/to-markdown', () => ({
  documentToMarkdown: documentToMarkdownMock,
}));

function buildRequest(projectId: string) {
  return new NextRequest(`https://example.com/api/projects/export/markdown?projectId=${projectId}`);
}

describe('GET /api/projects/export/markdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserIdMock.mockResolvedValue('user-1');
    projectToSemanticDocumentMock.mockReturnValue({ document: { version: 1, metadata: {}, blocks: [] } });
    documentToMarkdownMock.mockReturnValue('# Title\n\nBody text.');
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
    expect(documentToMarkdownMock).not.toHaveBeenCalled();
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
    expect(documentToMarkdownMock).toHaveBeenCalledTimes(1);
    await expect(response.text()).resolves.toContain('# Title');
  });

  test('missing project → 404', async () => {
    getProjectByIdMock.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(buildRequest('missing'));

    expect(response.status).toBe(404);
  });
});
