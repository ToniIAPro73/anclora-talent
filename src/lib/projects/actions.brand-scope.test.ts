import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * U6/U8 — document-data modal scopes:
 * - composition project scope merges into document metadata without dropping
 *   existing keys; the explicit "no brand" marker is written/cleared there.
 * - composition global scope stores user defaults; `overwriteCustom` (off by
 *   default) is the only path that rewrites per-project compositions.
 * - brand global scope sets the DEFAULT profile (active) — it never
 *   overwrites per-project explicit choices (explicit > default > none).
 */
describe('document-data modal scope actions (U6)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function setupMocks({
    projects = [],
    profiles = [],
  }: {
    projects?: Array<{ id: string; title: string; metadata?: Record<string, unknown> }>;
    profiles?: Array<{ id: string; status: string }>;
  } = {}) {
    type MockExtras = {
      metadata: {
        isbn?: string;
        brandChoice?: string;
        composition: { fontSizePt?: number };
      };
    };
    type MockPrefs = { compositionDefaults: { fontFamily?: string } };
    const saveDocumentExtras = vi.fn<(userId: string, projectId: string, extras: MockExtras) => Promise<void>>(
      async () => undefined,
    );
    const saveProjectBrandProfile = vi.fn(async () => undefined);
    const saveEditorPreferences = vi.fn<(userId: string, prefs: MockPrefs) => Promise<void>>(
      async () => undefined,
    );
    const setBrandProfileStatus = vi.fn(async () => undefined);
    const listProjectsForUser = vi.fn(async () => projects.map(({ id, title }) => ({ id, title })));
    const getProjectById = vi.fn(async (_userId: string, id: string) => {
      const found = projects.find((p) => p.id === id);
      if (!found) return null;
      return {
        id: found.id,
        title: found.title,
        brandProfileId: null,
        document: { metadata: found.metadata ?? { title: found.title } },
      };
    });

    vi.doMock('server-only', () => ({}));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(async () => 'u-1') }));
    vi.doMock('@/lib/db/repositories', () => ({
      projectRepository: { saveDocumentExtras, saveProjectBrandProfile, listProjectsForUser, getProjectById },
      userPreferencesRepository: {
        getEditorPreferences: vi.fn(async () => null),
        saveEditorPreferences,
      },
    }));
    vi.doMock('@/lib/brand/repository', () => ({
      brandProfileRepository: {
        setBrandProfileStatus,
        listBrandProfilesForUser: vi.fn(async () => profiles),
      },
    }));

    return { saveDocumentExtras, saveProjectBrandProfile, saveEditorPreferences, setBrandProfileStatus };
  }

  test('project scope merges composition into metadata and keeps existing keys', async () => {
    const mocks = setupMocks({
      projects: [{ id: 'p-1', title: 'Libro', metadata: { title: 'Libro', isbn: '978' } }],
    });
    const { saveProjectCompositionAction } = await import('./actions');

    const formData = new FormData();
    formData.set('projectId', 'p-1');
    formData.set('composition', JSON.stringify({ fontSizePt: 11.5, margins: { top: 1, bottom: 2, left: 3, right: 4 } }));
    formData.set('brandChoice', 'none');
    await saveProjectCompositionAction(formData);

    expect(mocks.saveDocumentExtras).toHaveBeenCalledTimes(1);
    const [, , extras] = mocks.saveDocumentExtras.mock.calls[0];
    expect(extras.metadata.isbn).toBe('978');
    expect(extras.metadata.composition.fontSizePt).toBe(11.5);
    expect(extras.metadata.brandChoice).toBe('none');
  });

  test('global scope saves user defaults and leaves projects untouched when overwrite is off', async () => {
    const mocks = setupMocks({
      projects: [{ id: 'p-1', title: 'Libro', metadata: { title: 'Libro', composition: { fontSizePt: 10 } } }],
    });
    const { saveUserCompositionDefaultsAction } = await import('./actions');

    const formData = new FormData();
    formData.set('defaults', JSON.stringify({ fontFamily: 'Inter', fontSizePt: 12 }));
    formData.set('overwriteCustom', 'false');
    await saveUserCompositionDefaultsAction(formData);

    expect(mocks.saveEditorPreferences).toHaveBeenCalledTimes(1);
    const [, prefs] = mocks.saveEditorPreferences.mock.calls[0];
    expect(prefs.compositionDefaults.fontFamily).toBe('Inter');
    expect(mocks.saveDocumentExtras).not.toHaveBeenCalled();
  });

  test('global scope with overwrite only rewrites projects that have their own composition', async () => {
    const mocks = setupMocks({
      projects: [
        { id: 'p-own', title: 'Con propia', metadata: { title: 'Con propia', composition: { fontSizePt: 10 } } },
        { id: 'p-inherit', title: 'Hereda', metadata: { title: 'Hereda' } },
      ],
    });
    const { saveUserCompositionDefaultsAction } = await import('./actions');

    const formData = new FormData();
    formData.set('defaults', JSON.stringify({ fontSizePt: 13 }));
    formData.set('overwriteCustom', 'true');
    await saveUserCompositionDefaultsAction(formData);

    expect(mocks.saveDocumentExtras).toHaveBeenCalledTimes(1);
    const [, projectId, extras] = mocks.saveDocumentExtras.mock.calls[0];
    expect(projectId).toBe('p-own');
    expect(extras.metadata.composition.fontSizePt).toBe(13);
  });

  test('brand global scope activates the default profile without touching per-project links', async () => {
    const mocks = setupMocks({ projects: [{ id: 'p-1', title: 'Libro' }] });
    const { setBrandForAllProjectsAction } = await import('./actions');

    const formData = new FormData();
    formData.set('brandProfileId', 'bp-9');
    await setBrandForAllProjectsAction(formData);

    expect(mocks.setBrandProfileStatus).toHaveBeenCalledWith('u-1', 'bp-9', 'active');
    expect(mocks.saveProjectBrandProfile).not.toHaveBeenCalled();
  });

  test('brand global scope with no profile clears the default (active -> draft)', async () => {
    const mocks = setupMocks({
      profiles: [
        { id: 'bp-1', status: 'active' },
        { id: 'bp-2', status: 'draft' },
      ],
    });
    const { setBrandForAllProjectsAction } = await import('./actions');

    const formData = new FormData();
    formData.set('brandProfileId', '');
    await setBrandForAllProjectsAction(formData);

    expect(mocks.setBrandProfileStatus).toHaveBeenCalledTimes(1);
    expect(mocks.setBrandProfileStatus).toHaveBeenCalledWith('u-1', 'bp-1', 'draft');
    expect(mocks.saveProjectBrandProfile).not.toHaveBeenCalled();
  });
});
