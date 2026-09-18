import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DashboardWorkspace } from './DashboardWorkspace';
import { appMessages } from '@/lib/i18n/messages';
import type { ProjectSummary } from '@/lib/projects/types';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }), usePathname: () => '/dashboard', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/projects/actions', () => ({ deleteProjectAction: vi.fn() }));
const projects: ProjectSummary[] = [
  { id: 'older', slug: 'older', title: 'Atlas', status: 'draft', createdAt: '2026-01-01', updatedAt: '2026-01-01', documentTitle: 'Atlas', documentSubtitle: 'Memories', documentAuthor: 'Author', chapterCount: 3, pageCount: null, coverPalette: 'teal' },
  { id: 'recent', slug: 'recent', title: 'Forms', status: 'active', createdAt: '2026-01-01', updatedAt: '2026-09-01', documentTitle: 'Forms', documentSubtitle: '', documentAuthor: '', chapterCount: 8, pageCount: 42, coverPalette: 'obsidian' },
];
function mount(locale: 'en' | 'es' = 'en', items = projects, dataAvailable = true) {
  return render(<DashboardWorkspace projects={items} dataAvailable={dataAvailable} locale={locale} copy={appMessages[locale].dashboard} projectCopy={appMessages[locale].project} />);
}

describe('Dashboard workspace', () => {
  test('orders real projects by last update and preserves editor/preview/menu actions', () => {
    mount();
    const rows = screen.getAllByRole('article');
    expect(within(rows[0]).getByRole('heading', { name: 'Forms' })).toBeInTheDocument();
    expect(within(rows[0]).getByRole('link', { name: appMessages.en.project.cardOpenEditor })).toHaveAttribute('href', '/projects/recent/editor');
    expect(within(rows[0]).getByRole('link', { name: appMessages.en.project.cardPreview })).toHaveAttribute('href', '/projects/recent/preview');
    fireEvent.click(within(rows[0]).getByRole('button', { name: appMessages.en.project.cardActionsMenu }));
    expect(screen.getByRole('menuitem')).toHaveAttribute('href', '/projects/recent/editor?documentData=open');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
  test('searches, sorts, filters and switches layout without losing results', () => {
    mount();
    fireEvent.change(screen.getByLabelText(appMessages.en.dashboard.projectsSortLabel), { target: { value: 'title' } });
    expect(within(screen.getAllByRole('article')[0]).getByRole('heading', { name: 'Atlas' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(appMessages.en.dashboard.projectsSearchLabel), { target: { value: 'Memories' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText(appMessages.en.dashboard.projectsStatusFilterLabel), { target: { value: 'active' } });
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByText('No matching projects')).toBeInTheDocument();
  });
  test.each(['es', 'en'] as const)('offers the existing new project route in the %s empty state', (locale) => {
    mount(locale, []);
    expect(screen.getByRole('link', { name: appMessages[locale].dashboard.sectionNewProject })).toHaveAttribute('href', '/projects/new');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  test('distinguishes data failure from empty projects and retries', () => {
    mount('en', [], false);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load projects');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByText('Your next story starts here')).not.toBeInTheDocument();
  });
  test('paginates so every project remains reachable', () => {
    mount('en', Array.from({ length: 26 }, (_, i) => ({ ...projects[0], id: `p${i}`, title: `Project ${String(i).padStart(2, '0')}` })));
    expect(screen.getAllByRole('article')).toHaveLength(25);
    fireEvent.click(screen.getByRole('button', { name: appMessages.en.dashboard.projectsTableNext }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});
