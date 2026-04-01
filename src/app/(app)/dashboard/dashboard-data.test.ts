import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { loadDashboardData } from './dashboard-data';

describe('loadDashboardData', () => {
  test('returns projects when repository call succeeds', async () => {
    const listProjectsForUser = vi.fn().mockResolvedValue([
      {
        id: 'project_1',
        slug: 'manual',
        title: 'Manual',
        status: 'draft',
        updatedAt: new Date().toISOString(),
        documentTitle: 'Documento',
        coverPalette: 'obsidian',
      },
    ]);

    const result = await loadDashboardData('user_123', { listProjectsForUser });

    expect(result.projects).toHaveLength(1);
    expect(result.dataAvailable).toBe(true);
  });

  test('falls back to an empty state when repository fails', async () => {
    const listProjectsForUser = vi.fn().mockRejectedValue(new Error('database unavailable'));

    const result = await loadDashboardData('user_123', { listProjectsForUser });

    expect(result.projects).toEqual([]);
    expect(result.dataAvailable).toBe(false);
  });
});
