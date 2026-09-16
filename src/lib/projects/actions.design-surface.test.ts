import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDesignLayer, createEmptyDesignSurface } from './design-surface';

function makeProject(overrides: Partial<Record<'cover' | 'backCover', Record<string, unknown>>> = {}) {
  return {
    id: 'p-1',
    cover: {
      title: 'Título', subtitle: 'Sub', palette: 'obsidian', backgroundImageUrl: null,
      thumbnailUrl: null, layout: 'centered', fontFamily: null, accentColor: null, showSubtitle: true,
      ...overrides.cover,
    },
    backCover: {
      title: 'Título', body: 'Cuerpo', authorBio: 'Bio', accentColor: null, backgroundImageUrl: null,
      ...overrides.backCover,
    },
  };
}

describe('saveCoverDesignAction / saveBackCoverDesignAction', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function setupMocks(project: ReturnType<typeof makeProject>) {
    type SaveFn = (userId: string, projectId: string, input: Record<string, unknown>) => Promise<typeof project>;
    type GetFn = (userId: string, projectId: string) => Promise<ReturnType<typeof makeProject> | null>;
    const saveCover = vi.fn<SaveFn>(async () => project);
    const saveBackCover = vi.fn<SaveFn>(async () => project);
    const getProjectById = vi.fn<GetFn>(async () => project);
    const uploadProjectBlob = vi.fn(async () => ({ url: 'https://blob.example/uploaded.png' }));

    vi.doMock('server-only', () => ({}));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(async () => 'u-1') }));
    vi.doMock('@/lib/db/repositories', () => ({
      projectRepository: { getProjectById, saveCover, saveBackCover },
    }));
    vi.doMock('@/lib/blob/client', () => ({ uploadProjectBlob, uploadPrivateProjectDocument: vi.fn() }));

    return { saveCover, saveBackCover, getProjectById, uploadProjectBlob };
  }

  test('saves a valid cover DesignSurface, carrying over the unrelated cover fields unchanged', async () => {
    const project = makeProject();
    const mocks = setupMocks(project);
    const { saveCoverDesignAction } = await import('./actions');

    const surface = createEmptyDesignSurface('cover');
    surface.layers = [createDesignLayer({ type: 'text', content: 'Nuevo título', role: 'title', source: 'manual' }, 1)];

    const result = await saveCoverDesignAction('p-1', surface);

    expect(result).toEqual({ status: 'saved' });
    expect(mocks.saveCover).toHaveBeenCalledTimes(1);
    const [, , input] = mocks.saveCover.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(input.title).toBe('Título');
    expect(input.palette).toBe('obsidian');
    expect((input.surfaceState as typeof surface).layers).toHaveLength(1);
  });

  test('rejects an invalid payload without ever calling saveCover', async () => {
    setupMocks(makeProject());
    const { saveCoverDesignAction } = await import('./actions');

    const result = await saveCoverDesignAction('p-1', { not: 'a design surface' });
    expect(result.status).toBe('error');
  });

  test('rejects a back-cover surface submitted through the cover action (surface mismatch)', async () => {
    setupMocks(makeProject());
    const { saveCoverDesignAction } = await import('./actions');

    const surface = createEmptyDesignSurface('back-cover');
    const result = await saveCoverDesignAction('p-1', surface);
    expect(result.status).toBe('error');
  });

  test('returns an error, never throws, when the project does not exist or is not owned by the caller', async () => {
    const mocks = setupMocks(makeProject());
    mocks.getProjectById.mockResolvedValueOnce(null);
    const { saveCoverDesignAction } = await import('./actions');

    const surface = createEmptyDesignSurface('cover');
    const result = await saveCoverDesignAction('missing-project', surface);
    expect(result.status).toBe('error');
    expect(mocks.saveCover).not.toHaveBeenCalled();
  });

  test('uploads a data: URL image layer to blob storage before persisting, instead of inlining it', async () => {
    const mocks = setupMocks(makeProject());
    const { saveCoverDesignAction } = await import('./actions');

    const surface = createEmptyDesignSurface('cover');
    surface.layers = [
      createDesignLayer({ type: 'image', src: 'data:image/png;base64,AAAA' }, 1),
    ];

    await saveCoverDesignAction('p-1', surface);

    expect(mocks.uploadProjectBlob).toHaveBeenCalledTimes(1);
    const [, , input] = mocks.saveCover.mock.calls[0] as [string, string, { surfaceState: { layers: Array<{ src: string }> } }];
    expect(input.surfaceState.layers[0].src).toBe('https://blob.example/uploaded.png');
  });

  test('saves a valid back-cover DesignSurface', async () => {
    const project = makeProject();
    const mocks = setupMocks(project);
    const { saveBackCoverDesignAction } = await import('./actions');

    const surface = createEmptyDesignSurface('back-cover');
    surface.layers = [createDesignLayer({ type: 'text', content: 'Sinopsis', role: 'body', source: 'manual' }, 1)];

    const result = await saveBackCoverDesignAction('p-1', surface);
    expect(result).toEqual({ status: 'saved' });
    expect(mocks.saveBackCover).toHaveBeenCalledTimes(1);
  });

  test('rejects a cover surface submitted through the back-cover action', async () => {
    setupMocks(makeProject());
    const { saveBackCoverDesignAction } = await import('./actions');

    const surface = createEmptyDesignSurface('cover');
    const result = await saveBackCoverDesignAction('p-1', surface);
    expect(result.status).toBe('error');
  });
});
