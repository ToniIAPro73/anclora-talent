import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { fetchPrivateProjectDocumentMock } = vi.hoisted(() => ({
  fetchPrivateProjectDocumentMock: vi.fn(),
}));

vi.mock('@/lib/blob/client', () => ({
  fetchPrivateProjectDocument: fetchPrivateProjectDocumentMock,
}));

import type { ProjectRecord } from './types';
import { fetchOriginalPdfBuffer, OriginalPdfNotFoundError } from './original-pdf';

function projectWithSourceAsset(overrides: Partial<ProjectRecord['assets'][number]> = {}): ProjectRecord {
  return {
    id: 'p1',
    slug: 'el-plan-de-escape',
    document: { source: { sourceAccessLevel: 'private' } },
    assets: [
      {
        id: 'a1',
        kind: 'document',
        usage: 'source-document',
        blobUrl: 'https://blob.example/source.pdf',
        fileName: 'El_Plan_de_Escape_EBOOK.pdf',
        mimeType: 'application/pdf',
        createdAt: '2026-01-01T00:00:00Z',
        ...overrides,
      },
    ],
  } as unknown as ProjectRecord;
}

function streamOf(bytes: number[]) {
  return new Response(new Uint8Array(bytes)).body!;
}

describe('fetchOriginalPdfBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns the exact original bytes and the stored file name', async () => {
    fetchPrivateProjectDocumentMock.mockResolvedValue({
      statusCode: 200,
      stream: streamOf([0x25, 0x50, 0x44, 0x46]),
    });

    const { buffer, fileName } = await fetchOriginalPdfBuffer(projectWithSourceAsset());

    expect(Array.from(buffer)).toEqual([0x25, 0x50, 0x44, 0x46]);
    expect(fileName).toBe('El_Plan_de_Escape_EBOOK.pdf');
  });

  test('throws OriginalPdfNotFoundError when the project has no source-document asset', async () => {
    const project = { id: 'p1', slug: 's', document: {}, assets: [] } as unknown as ProjectRecord;
    await expect(fetchOriginalPdfBuffer(project)).rejects.toBeInstanceOf(OriginalPdfNotFoundError);
    expect(fetchPrivateProjectDocumentMock).not.toHaveBeenCalled();
  });

  test('throws OriginalPdfNotFoundError when the blob store returns null', async () => {
    fetchPrivateProjectDocumentMock.mockResolvedValue(null);
    await expect(fetchOriginalPdfBuffer(projectWithSourceAsset())).rejects.toBeInstanceOf(
      OriginalPdfNotFoundError,
    );
  });

  test('throws OriginalPdfNotFoundError on a non-200 status', async () => {
    fetchPrivateProjectDocumentMock.mockResolvedValue({ statusCode: 404, stream: streamOf([1]) });
    await expect(fetchOriginalPdfBuffer(projectWithSourceAsset())).rejects.toBeInstanceOf(
      OriginalPdfNotFoundError,
    );
  });
});
