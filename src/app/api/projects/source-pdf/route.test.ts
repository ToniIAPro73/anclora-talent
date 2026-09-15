import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const requireUserIdMock = vi.fn();
const getProjectByIdMock = vi.fn();
const fetchPrivateProjectDocumentMock = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  requireUserId: requireUserIdMock,
}));

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: { getProjectById: getProjectByIdMock },
}));

vi.mock('@/lib/blob/client', () => ({
  fetchPrivateProjectDocument: fetchPrivateProjectDocumentMock,
}));

function buildProject(overrides: { assets?: unknown[]; sourceAccessLevel?: 'private' | 'public-proxy-only' } = {}) {
  return {
    id: 'project-1',
    slug: 'el-plan-de-escape',
    document: { source: { mode: 'fixed-pdf', sourceAccessLevel: overrides.sourceAccessLevel ?? 'private' } },
    assets:
      overrides.assets ?? [
        {
          id: 'asset-1',
          kind: 'document',
          usage: 'source-document',
          blobUrl: 'projects/project-1/source/1700000000000-el-plan.pdf',
          fileName: 'El_Plan_de_Escape_EBOOK.pdf',
          mimeType: 'application/pdf',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
  };
}

function buildRequest(query = 'projectId=project-1') {
  return new NextRequest(`https://example.com/api/projects/source-pdf?${query}`);
}

function fakeStream(content: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });
}

describe('GET /api/projects/source-pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('unauthenticated requests never reach the repository or the blob store', async () => {
    requireUserIdMock.mockRejectedValue(new Error('redirect-to-sign-in'));

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).not.toBe(200);
    expect(getProjectByIdMock).not.toHaveBeenCalled();
    expect(fetchPrivateProjectDocumentMock).not.toHaveBeenCalled();
  });

  test('missing project → 404, without leaking whether it belongs to someone else', async () => {
    requireUserIdMock.mockResolvedValue('user-1');
    getProjectByIdMock.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(404);
    expect(fetchPrivateProjectDocumentMock).not.toHaveBeenCalled();
  });

  test('security matrix: different authenticated user requesting someone else\'s project → 404, blob never touched', async () => {
    // getProjectById is itself scoped by (projectId AND userId) at the query
    // level (src/lib/db/repositories.ts) — a different user's call resolves
    // to null exactly like "missing project", which this route must not
    // distinguish (no ownership leak via a different status code).
    requireUserIdMock.mockResolvedValue('user-2-not-the-owner');
    getProjectByIdMock.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(404);
    expect(getProjectByIdMock).toHaveBeenCalledWith('user-2-not-the-owner', 'project-1');
    expect(fetchPrivateProjectDocumentMock).not.toHaveBeenCalled();
  });

  test('security matrix: owner request succeeds and the private blob URL never appears in the response', async () => {
    requireUserIdMock.mockResolvedValue('user-1');
    getProjectByIdMock.mockResolvedValue(buildProject());
    fetchPrivateProjectDocumentMock.mockResolvedValue({
      statusCode: 200,
      stream: fakeStream('%PDF-1.4 fake bytes'),
      headers: new Headers(),
      blob: { contentType: 'application/pdf', size: 19 },
    });

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    const headerDump = JSON.stringify(Object.fromEntries(response.headers.entries()));
    expect(headerDump).not.toContain('projects/project-1/source/1700000000000-el-plan.pdf');
    expect(headerDump).not.toContain('blob.vercel-storage.com');
  });

  test('project with no source-document asset → 404', async () => {
    requireUserIdMock.mockResolvedValue('user-1');
    getProjectByIdMock.mockResolvedValue(buildProject({ assets: [] }));

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(404);
    expect(fetchPrivateProjectDocumentMock).not.toHaveBeenCalled();
  });

  test('editable project (null blobUrl) → 404, same as missing', async () => {
    requireUserIdMock.mockResolvedValue('user-1');
    getProjectByIdMock.mockResolvedValue(
      buildProject({
        assets: [
          {
            id: 'asset-1',
            kind: 'document',
            usage: 'source-document',
            blobUrl: null,
            fileName: 'manuscrito.docx',
            mimeType: 'application/octet-stream',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    );

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(404);
  });

  test('blob store returns nothing → 404', async () => {
    requireUserIdMock.mockResolvedValue('user-1');
    getProjectByIdMock.mockResolvedValue(buildProject());
    fetchPrivateProjectDocumentMock.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(404);
  });

  test('success → 200, correct headers, inline disposition by default', async () => {
    requireUserIdMock.mockResolvedValue('user-1');
    getProjectByIdMock.mockResolvedValue(buildProject());
    fetchPrivateProjectDocumentMock.mockResolvedValue({
      statusCode: 200,
      stream: fakeStream('%PDF-1.4 fake bytes'),
      headers: new Headers(),
      blob: { contentType: 'application/pdf', size: 19 },
    });

    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-disposition')).toBe(
      'inline; filename="El_Plan_de_Escape_EBOOK.pdf"',
    );
    expect(fetchPrivateProjectDocumentMock).toHaveBeenCalledWith(
      'projects/project-1/source/1700000000000-el-plan.pdf',
      'private',
    );
  });

  test('?download=1 → attachment disposition', async () => {
    requireUserIdMock.mockResolvedValue('user-1');
    getProjectByIdMock.mockResolvedValue(buildProject());
    fetchPrivateProjectDocumentMock.mockResolvedValue({
      statusCode: 200,
      stream: fakeStream('%PDF-1.4 fake bytes'),
      headers: new Headers(),
      blob: { contentType: 'application/pdf', size: 19 },
    });

    const { GET } = await import('./route');
    const response = await GET(buildRequest('projectId=project-1&download=1'));

    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="El_Plan_de_Escape_EBOOK.pdf"',
    );
  });
});
