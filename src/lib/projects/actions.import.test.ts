import { describe, expect, test, vi } from 'vitest';

describe('project actions module loading', () => {
  test('does not eagerly load document import parsers on module import', async () => {
    vi.resetModules();
    vi.doMock('server-only', () => ({}));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('next/navigation', () => ({ redirect: vi.fn() }));
    vi.doMock('@/lib/auth/guards', () => ({ requireUserId: vi.fn() }));
    vi.doMock('@/lib/blob/client', () => ({ uploadProjectBlob: vi.fn() }));
    vi.doMock('@/lib/db/repositories', () => ({
      projectRepository: {
        createProject: vi.fn(),
        saveDocument: vi.fn(),
        saveCover: vi.fn(),
      },
    }));
    vi.doMock('./import', () => {
      throw new Error('import parser loaded eagerly');
    });

    await expect(import('./actions')).resolves.toBeDefined();
  });
});
