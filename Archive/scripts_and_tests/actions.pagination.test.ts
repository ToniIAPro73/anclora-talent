import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(() => Promise.resolve('user_123')) }));

const saveDocumentMock = vi.fn();
const getProjectByIdMock = vi.fn();

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: {
    getProjectById: (...args: any[]) => getProjectByIdMock(...args),
    saveDocument: (...args: any[]) => saveDocumentMock(...args),
  },
}));

const buildSyncedMock = vi.fn();
vi.mock('@/lib/preview/preview-builder', async (importOriginal) => {
  const mod = await importOriginal() as any;
  return {
    ...mod,
    buildSyncedTocChapterContent: (...args: any[]) => buildSyncedMock(...args),
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
  beforeEach(() => {
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
  });

  test('persiste HTML con numeros cuando cambia', async () => {
    buildSyncedMock.mockReturnValue({
      chapterId: 'toc',
      html: '<p>Indice <span class="page-num">12</span></p>',
    });

    const res = await syncProjectPaginationAction(formData({ projectId: 'proj_1' }));
    
    expect(res.status).toBe('updated');
    expect(saveDocumentMock).toHaveBeenCalledTimes(1);
    const savedContent = saveDocumentMock.mock.calls[0][2].blocks[0].content;
    expect(savedContent).toContain('page-num');
    expect(savedContent).toContain('12');
  });

  test('no guarda si el HTML ya tiene los numeros', async () => {
    const { chapterBlocksToHtml } = await import('./chapter-html');
    (chapterBlocksToHtml as any).mockReturnValue('<p>Indice <span class="page-num">12</span></p>');
    
    buildSyncedMock.mockReturnValue({
      chapterId: 'toc',
      html: '<p>Indice <span class="page-num">12</span></p>',
    });

    await syncProjectPaginationAction(formData({ projectId: 'proj_1' }));
    expect(saveDocumentMock).not.toHaveBeenCalled();
  });

  test('REGRESION: no guarda version sanitizada', async () => {
    buildSyncedMock.mockReturnValue({
      chapterId: 'toc',
      html: '<p>Indice <span class="page-num">12</span></p>',
    });

    await syncProjectPaginationAction(formData({ projectId: 'proj_1' }));
    const saved = saveDocumentMock.mock.calls[0][2].blocks[0].content;
    
    expect(saved).toBe('<p>Indice <span class="page-num">12</span></p>');
    expect(saved).not.toBe('<p>Indice</p>');
  });
});
