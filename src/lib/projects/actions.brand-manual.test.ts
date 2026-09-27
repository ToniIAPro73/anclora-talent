import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * The simplified new-project flow keeps brand identity disabled. Legacy
 * `brandManual` form data must not trigger extraction or a project binding.
 */
describe('createProjectAction brand manual (U5)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function setupMocks({
    extractImpl,
  }: {
    extractImpl?: () => Promise<{ profile: Record<string, unknown>; warnings: string[] }>;
  } = {}) {
    const redirectMock = vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
    const createProject = vi.fn(async () => ({ id: 'p-1', slug: 'p-1' }));
    const saveProjectBrandProfile = vi.fn(async () => undefined);
    const createBrandProfile = vi.fn(async () => ({ id: 'bp-1', status: 'draft' }));
    const setBrandProfileStatus = vi.fn(async () => ({ id: 'bp-1', status: 'active' }));
    const extractBrandProfileFromPdf = vi.fn(
      extractImpl ?? (async () => ({ profile: { name: 'Anclora' }, warnings: [] })),
    );

    vi.doMock('server-only', () => ({}));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('next/navigation', () => ({ redirect: redirectMock }));
    vi.doMock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(async () => 'u-1') }));
    vi.doMock('@/lib/db/repositories', () => ({
      projectRepository: {
        createProject,
        saveDocument: vi.fn(),
        saveCover: vi.fn(),
        saveProjectBrandProfile,
      },
    }));
    vi.doMock('@/lib/brand/extract-brand-profile', () => ({ extractBrandProfileFromPdf }));
    vi.doMock('@/lib/brand/repository', () => ({
      brandProfileRepository: { createBrandProfile, setBrandProfileStatus },
    }));

    return { redirectMock, createProject, saveProjectBrandProfile, createBrandProfile, setBrandProfileStatus, extractBrandProfileFromPdf };
  }

  function formWithManual(): FormData {
    const formData = new FormData();
    formData.append('title', 'Libro de marca');
    formData.append('brandManual', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'manual.pdf', { type: 'application/pdf' }));
    return formData;
  }

  test('ignores the legacy brand manual field while creating the project', async () => {
    const mocks = setupMocks();
    const { createProjectAction } = await import('./actions');

    await expect(createProjectAction(formWithManual())).rejects.toThrow('NEXT_REDIRECT:/projects/p-1/editor');

    expect(mocks.extractBrandProfileFromPdf).not.toHaveBeenCalled();
    expect(mocks.createBrandProfile).not.toHaveBeenCalled();
    expect(mocks.setBrandProfileStatus).not.toHaveBeenCalled();
    expect(mocks.saveProjectBrandProfile).not.toHaveBeenCalled();
  });

  test('does not invoke extraction even when the legacy manual would fail', async () => {
    const mocks = setupMocks({
      extractImpl: async () => {
        throw new Error('corrupt pdf');
      },
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { createProjectAction } = await import('./actions');

    await expect(createProjectAction(formWithManual())).rejects.toThrow('NEXT_REDIRECT:/projects/p-1/editor');

    expect(mocks.createProject).toHaveBeenCalledTimes(1);
    expect(mocks.extractBrandProfileFromPdf).not.toHaveBeenCalled();
    expect(mocks.saveProjectBrandProfile).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
