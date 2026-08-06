import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/dashboard',
}));

import { PaginatedProjectGrid } from './PaginatedProjectGrid';
import type { ProjectSummary } from '@/lib/projects/types';
import { appMessages } from '@/lib/i18n/messages';

const copy = appMessages.es.project;
const dashboardCopy = appMessages.es.dashboard;

function makeProjects(count: number): ProjectSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p-${index}`,
    slug: `p-${index}`,
    title: `Proyecto ${index}`,
    status: 'draft',
    updatedAt: `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
    documentTitle: 'Documento',
    coverPalette: 'obsidian',
  })) as ProjectSummary[];
}

describe('PaginatedProjectGrid (P-U3-01)', () => {
  test('renders the first batch of 12 and offers load-more when more remain', () => {
    render(<PaginatedProjectGrid copy={copy} dashboardCopy={dashboardCopy} locale="es" projects={makeProjects(20)} />);

    expect(screen.getAllByTestId('project-card-menu')).toHaveLength(12);
    expect(screen.getByTestId('dashboard-load-more')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dashboard-load-more'));

    expect(screen.getAllByTestId('project-card-menu')).toHaveLength(20);
    expect(screen.queryByTestId('dashboard-load-more')).not.toBeInTheDocument();
  });

  test('hides the load-more control when all projects fit in one batch', () => {
    render(<PaginatedProjectGrid copy={copy} dashboardCopy={dashboardCopy} locale="es" projects={makeProjects(5)} />);

    expect(screen.getAllByTestId('project-card-menu')).toHaveLength(5);
    expect(screen.queryByTestId('dashboard-load-more')).not.toBeInTheDocument();
  });
});
