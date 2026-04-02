import { describe, expect, test, vi } from 'vitest';

describe('project actions module loading', () => {
  test('does not eagerly load document import parsers on module import', async () => {
    vi.resetModules();
    vi.doMock('server-only', () => ({}));
    vi.doMock('./import', () => {
      throw new Error('import parser loaded eagerly');
    });

    await expect(import('./actions')).resolves.toBeDefined();
  }, 15000);
});
