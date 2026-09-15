import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const requireUserIdMock = vi.fn();
const getProjectByIdMock = vi.fn();
const fetchPrivateProjectDocumentMock = vi.fn();
const buildProjectPdfWithConfigMock = vi.fn();
const renderToBufferMock = vi.fn();
const resolveProjectBrandTemplateOverridesMock = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  requireUserId: requireUserIdMock,
}));

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: { getProjectById: getProjectByIdMock },
}));

vi.mock('@/lib/blob/client', () => ({
  fetchPrivateProjectDocument: fetchPrivateProjectDocumentMock,
}));

vi.mock('@/lib/projects/export-builder', () => ({
  buildProjectPdfWithConfig: buildProjectPdfWithConfigMock,
}));

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: renderToBufferMock,
}));

vi.mock('@/lib/brand/resolve', () => ({
  resolveProjectBrandTemplateOverrides: resolveProjectBrandTemplateOverridesMock,
}));

function buildEditableProject() {
  return {
    id: 'project-1',
    slug: 'manuscrito',
    document: { source: null, rules: null },
    assets: [],
  };
}

function buildFixedPdfProject(overrides: { assets?: unknown[] } = {}) {
  return {
    id: 'project-2',
    slug: 'el-plan-de-escape',
    document: { source: { mode: 'fixed-pdf' }, rules: null },
    assets:
      overrides.assets ?? [
        {
          id: 'asset-1',
          kind: 'document',
          usage: 'source-document',
          blobUrl: 'projects/project-2/source/1700000000000-el-plan.pdf',
          fileName: 'El_Plan_de_Escape_EBOOK.pdf',
          mimeType: 'application/pdf',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
  };
}

function buildRequest(projectId: string) {
  return new NextRequest(`https://example.com/api/projects/export/pdf?projectId=${projectId}`);
}

function fakeStream(content: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });
}

describe('GET /api/projects/export/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserIdMock.mockResolvedValue('user-1');
    resolveProjectBrandTemplateOverridesMock.mockResolvedValue(undefined);
    buildProjectPdfWithConfigMock.mockResolvedValue('pdf-doc-element');
    renderToBufferMock.mockResolvedValue(Buffer.from('composed-pdf-bytes'));
  });

  test('fixed-pdf project bypasses the composer/builder pipeline entirely', async () => {
    getProjectByIdMock.mockResolvedValue(buildFixedPdfProject());
    fetchPrivateProjectDocumentMock.mockResolvedValue({
      statusCode: 200,
      stream: fakeStream('%PDF-1.4 original bytes'),
      headers: new Headers(),
      blob: { contentType: 'application/pdf', size: 24 },
    });

    const { GET } = await import('./route');
    const response = await GET(buildRequest('project-2'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="El_Plan_de_Escape_EBOOK.pdf"',
    );
    expect(buildProjectPdfWithConfigMock).not.toHaveBeenCalled();
    expect(renderToBufferMock).not.toHaveBeenCalled();
    expect(fetchPrivateProjectDocumentMock).toHaveBeenCalledWith(
      'projects/project-2/source/1700000000000-el-plan.pdf',
      'private',
    );
  });

  test('fixed-pdf project with no stored source PDF → 404, never falls back to the composer', async () => {
    getProjectByIdMock.mockResolvedValue(buildFixedPdfProject({ assets: [] }));

    const { GET } = await import('./route');
    const response = await GET(buildRequest('project-2'));

    expect(response.status).toBe(404);
    expect(buildProjectPdfWithConfigMock).not.toHaveBeenCalled();
  });

  test('regression: editable project still goes through buildProjectPdfWithConfig', async () => {
    getProjectByIdMock.mockResolvedValue(buildEditableProject());

    const { GET } = await import('./route');
    const response = await GET(buildRequest('project-1'));

    expect(response.status).toBe(200);
    expect(buildProjectPdfWithConfigMock).toHaveBeenCalledTimes(1);
    expect(renderToBufferMock).toHaveBeenCalledTimes(1);
    expect(fetchPrivateProjectDocumentMock).not.toHaveBeenCalled();
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="manuscrito.pdf"');
  });

  test('missing project → 404', async () => {
    getProjectByIdMock.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(buildRequest('missing'));

    expect(response.status).toBe(404);
    expect(buildProjectPdfWithConfigMock).not.toHaveBeenCalled();
  });
});
