import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ProjectsTableModal } from './ProjectsTableModal';
import type { ProjectSummary } from '@/lib/projects/types';
import { appMessages } from '@/lib/i18n/messages';

const replace = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/dashboard',
}));
vi.mock('@/lib/projects/actions', () => ({
  deleteProjectAction: vi.fn(),
}));

function makeProject(index: number, updatedAt: string): ProjectSummary {
  return {
    id: `p-${index}`,
    slug: `p-${index}`,
    title: `Proyecto ${index}`,
    status: index % 2 === 0 ? 'active' : 'draft',
    createdAt: `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
    updatedAt,
    documentSubtitle: `Sub ${index}`,
    documentAuthor: `Autor ${index}`,
    documentTitle: `Doc ${index}`,
    pageCount: index,
    chapterCount: index + 1,
    coverPalette: 'obsidian',
  };
}

describe('ProjectsTableModal', () => {
  test('renders columns and orders projects by updatedAt descending', () => {
    render(
      <ProjectsTableModal
        copy={appMessages.es.dashboard}
        projectCopy={appMessages.es.project}
        locale="es"
        projects={[
          makeProject(1, '2026-01-01T10:00:00Z'),
          makeProject(2, '2026-03-01T10:00:00Z'),
          makeProject(3, '2026-02-01T10:00:00Z'),
        ]}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Título' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Subtítulo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Autor' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Páginas' })).toBeInTheDocument();

    const rows = within(screen.getByTestId('projects-table')).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Proyecto 2')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Proyecto 3')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Proyecto 1')).toBeInTheDocument();
  });

  test('paginates in 25-row batches', () => {
    const projects = Array.from({ length: 26 }, (_, index) =>
      makeProject(index, `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`),
    );

    render(<ProjectsTableModal copy={appMessages.es.dashboard} projectCopy={appMessages.es.project} locale="es" projects={projects} />);

    expect(within(screen.getByTestId('projects-table')).getAllByRole('row')).toHaveLength(26);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(within(screen.getByTestId('projects-table')).getAllByRole('row')).toHaveLength(2);
  });
});
