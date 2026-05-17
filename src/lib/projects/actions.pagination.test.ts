import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(() => Promise.resolve('user_123')) }));

const saveDocumentMock = vi.fn();
const getProjectByIdMock = vi.fn();

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: {
    getProjectById: (...args: unknown[]) => getProjectByIdMock(...args),
    saveDocument: (...args: unknown[]) => saveDocumentMock(...args),
  },
}));

const buildSyncedMock = vi.fn();
vi.mock('@/lib/preview/preview-builder', async (importOriginal) => {
  const mod = await importOriginal() as Record<string, unknown>;
  return {
    ...mod,
    buildSyncedTocChapterContent: (...args: unknown[]) => buildSyncedMock(...args),
  };
});

vi.mock('./chapter-html', () => ({
  chapterBlocksToHtml: vi.fn(() => '<p>Indice</p>'),
}));

import { syncProjectPaginationAction } from './actions';

function formData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

describe('syncProjectPaginationAction - regresion numeracion', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    getProjectByIdMock.mockResolvedValue({
      id: 'proj_1',
      document: {
        title: 'Test',
        subtitle: '',
        author: 'Autor',
        chapters: [{ id: 'toc', title: 'Indice', blocks: [{ id: 'b1', content: '<p>Indice</p>' }] }],
      },
    });
    const { chapterBlocksToHtml } = await import('./chapter-html');
    vi.mocked(chapterBlocksToHtml).mockReturnValue('<p>Indice</p>');
  });

  test('persiste HTML con numeros cuando cambia', async () => {
    buildSyncedMock.mockReturnValue({
      chapterId: 'toc',
      html: '<p data-toc-entry="true" data-toc-level="2" data-toc-page="12"><span class="toc-title">Indice</span></p>',
    });

    const res = await syncProjectPaginationAction(formData({ projectId: 'proj_1' }));
    
    expect(res.status).toBe('updated');
    expect(saveDocumentMock).toHaveBeenCalledTimes(1);
    const savedContent = saveDocumentMock.mock.calls[0][2].blocks[0].content;
    expect(savedContent).toContain('data-toc-page="12"');
    expect(savedContent).toContain('toc-title');
  });

  test('no guarda si el HTML ya tiene los numeros', async () => {
    const { chapterBlocksToHtml } = await import('./chapter-html');
    vi.mocked(chapterBlocksToHtml).mockReturnValue('<p data-toc-entry="true" data-toc-level="2" data-toc-page="12"><span class="toc-title">Indice</span></p>');
    
    buildSyncedMock.mockReturnValue({
      chapterId: 'toc',
      html: '<p data-toc-entry="true" data-toc-level="2" data-toc-page="12"><span class="toc-title">Indice</span></p>',
    });

    await syncProjectPaginationAction(formData({ projectId: 'proj_1' }));
    expect(saveDocumentMock).not.toHaveBeenCalled();
  });

  test('REGRESION: no guarda version sanitizada', async () => {
    buildSyncedMock.mockReturnValue({
      chapterId: 'toc',
      html: '<p data-toc-entry="true" data-toc-level="2" data-toc-page="12"><span class="toc-title">Indice</span></p>',
    });

    await syncProjectPaginationAction(formData({ projectId: 'proj_1' }));
    const saved = saveDocumentMock.mock.calls[0][2].blocks[0].content;
    
    expect(saved).toBe('<p data-toc-entry="true" data-toc-level="2" data-toc-page="12"><span class="toc-title">Indice</span></p>');
    expect(saved).not.toBe('<p>Indice</p>');
  });
});
