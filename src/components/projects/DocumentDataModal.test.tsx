import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DocumentDataModal } from './DocumentDataModal';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/lib/projects/actions', () => ({
  saveProjectCompositionAction: vi.fn().mockResolvedValue({ ok: true }),
  saveUserCompositionDefaultsAction: vi.fn().mockResolvedValue({ ok: true }),
  setBrandForAllProjectsAction: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/brand/actions', () => ({
  setProjectBrandProfileAction: vi.fn().mockResolvedValue({ ok: true }),
}));

const copy = resolveLocaleMessages('es').project;

function makeProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: 'proj-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'proyecto-1',
    title: 'Mi Proyecto',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      id: 'doc-1',
      title: 'Mi Proyecto',
      subtitle: '',
      author: '',
      language: 'es',
      chapters: [],
    },
    cover: { id: 'cov-1', title: 'Mi Proyecto', subtitle: '', palette: 'obsidian', backgroundImageUrl: null, thumbnailUrl: null },
    backCover: { id: 'bc-1', title: 'Mi Proyecto', body: '', authorBio: '', accentColor: null, backgroundImageUrl: null, renderedImageUrl: null },
    assets: [],
    ...overrides,
  } as ProjectRecord;
}

describe('DocumentDataModal — composition scope (project mode)', () => {
  test('fixed-pdf project: no composition-scope section (there is no composition to scope)', () => {
    const project = makeProject({
      document: {
        ...makeProject().document,
        source: { fileName: 'a.pdf', mimeType: 'application/pdf', importedAt: '2026-01-01T00:00:00Z', mode: 'fixed-pdf' },
      },
    });

    render(
      <DocumentDataModal isOpen mode="project" copy={copy} onClose={() => {}} project={project} />,
    );

    expect(screen.getByTestId('document-data-composition-not-applicable')).toBeInTheDocument();
    expect(screen.queryByText(copy.documentDataScopeHeading)).not.toBeInTheDocument();
  });

  test('regression: an editable project still shows the composition-scope section', () => {
    render(
      <DocumentDataModal isOpen mode="project" copy={copy} onClose={() => {}} project={makeProject()} />,
    );

    expect(screen.queryByTestId('document-data-composition-not-applicable')).not.toBeInTheDocument();
    expect(screen.getByText(copy.documentDataScopeHeading)).toBeInTheDocument();
  });
});
