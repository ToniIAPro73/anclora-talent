import { beforeEach, describe, expect, test, vi } from 'vitest';

const revalidatePath = vi.fn();
const requireUserId = vi.fn();
const deleteProject = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ requireUserId }));
vi.mock('@/lib/blob/client', () => ({ uploadProjectBlob: vi.fn() }));
vi.mock('@/lib/db/repositories', () => ({
  projectRepository: {
    createProject: vi.fn(),
    saveDocument: vi.fn(),
    saveCover: vi.fn(),
    deleteProject,
  },
}));

describe('deleteProjectAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserId.mockResolvedValue('user_delete');
  });

  test('deletes the project, revalidates dashboard, and redirects to dashboard', async () => {
    const redirect = vi.fn();
    vi.mocked(await import('next/navigation')).redirect = redirect as never;

    const { deleteProjectAction } = await import('./actions');
    const formData = new FormData();
    formData.set('projectId', 'project-123');

    await deleteProjectAction(formData);

    expect(deleteProject).toHaveBeenCalledWith('user_delete', 'project-123');
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});
