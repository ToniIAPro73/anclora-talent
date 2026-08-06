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

  test('orders projects by updatedAt descending (P-U3-01)', async () => {
    const listProjectsForUser = vi.fn().mockResolvedValue([
      { id: 'old', slug: 'old', title: 'Old', status: 'draft', updatedAt: '2026-01-01T10:00:00Z', documentTitle: 'Doc', coverPalette: 'obsidian' },
      { id: 'new', slug: 'new', title: 'New', status: 'draft', updatedAt: '2026-02-01T10:00:00Z', documentTitle: 'Doc', coverPalette: 'teal' },
      { id: 'mid', slug: 'mid', title: 'Mid', status: 'draft', updatedAt: '2026-01-15T10:00:00Z', documentTitle: 'Doc', coverPalette: 'sand' },
    ]);

    const result = await loadDashboardData('user_123', { listProjectsForUser });

    expect(result.projects.map((project) => project.id)).toEqual(['new', 'mid', 'old']);
  });

  test('falls back to an empty state when repository fails', async () => {
    const listProjectsForUser = vi.fn().mockRejectedValue(new Error('database unavailable'));

    const result = await loadDashboardData('user_123', { listProjectsForUser });

    expect(result.projects).toEqual([]);
    expect(result.dataAvailable).toBe(false);
  });
});
