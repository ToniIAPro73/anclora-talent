import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DocumentDataModal } from './DocumentDataModal';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import { parseMarkdownSource, parsePlainTextSource, summarizeSourceModel, summarizeSourceText } from '@/lib/projects/source-model';

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
  test('pre-create mode exposes selectable application font families with system defaults', () => {
    render(
      <DocumentDataModal isOpen mode="pre-create" copy={copy} onClose={() => {}} />,
    );

    const fontSelect = screen.getByTestId('document-data-font-family-input');
    expect(fontSelect).toHaveValue('Georgia');
    expect(screen.getByRole('option', { name: 'Inter' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'EB Garamond' })).toBeInTheDocument();
  });

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

  test('Markdown project data separates source semantics from generated presentation', () => {
    const sourceModel = parseMarkdownSource('# H1\n\n## H2\n\nBody with **strong**.');
    const project = makeProject({
      document: {
        ...makeProject().document,
        source: { fileName: 'manuscrito.md', mimeType: 'text/markdown', importedAt: '2026-01-01T00:00:00Z', mode: 'editable' },
        metadata: { title: 'Mi Proyecto', sourceModel, sourceFormat: 'markdown', sourceFamily: 'semantic', sourceCapabilities: sourceModel.capabilities, importPresentationMode: 'materialized', presentationProvenance: 'TALENT_MATERIALIZED', presentationProfileId: 'talent-editorial-markdown-v1' },
      },
    });
    render(<DocumentDataModal isOpen mode="project" copy={copy} onClose={() => {}} project={project} />);
    expect(screen.getByTestId('markdown-import-data')).toBeInTheDocument();
    expect(screen.getByText(copy.markdownSourcePresentationNone)).toBeInTheDocument();
    expect(screen.getByText(copy.markdownMaterializedOrigin)).toBeInTheDocument();
    expect(screen.getByTestId('markdown-semantic-stats')).toHaveTextContent('H1');
  });

  test('TXT data is source-aware and never presents Talent defaults as imported typography', () => {
    const sourceModel = parsePlainTextSource('Capítulo 1\n\nTexto plano.');
    render(
      <DocumentDataModal
        isOpen
        mode="pre-create"
        copy={copy}
        onClose={() => {}}
        sourceFormat="txt"
        sourceFamily="plain"
        sourceStats={summarizeSourceModel(sourceModel)}
        sourceTextMetrics={summarizeSourceText(sourceModel)}
        initialSettings={{ fontFamily: 'Georgia', fontSizePt: 12, lineHeight: 1.5 }}
      />,
    );

    expect(screen.getByTestId('plain-text-import-data')).toBeInTheDocument();
    expect(screen.getByText(copy.documentDataPlainTextPresentation)).toBeInTheDocument();
    expect(screen.getByText(copy.documentDataTalentDefaultPresentation)).toBeInTheDocument();
    expect(screen.queryByTestId('document-data-font-family-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('document-data-source-badge')).not.toBeInTheDocument();
  });

  test('project mode keeps the full data surface and uses the wide layout contract', () => {
    render(<DocumentDataModal isOpen mode="project" copy={copy} onClose={() => {}} project={makeProject()} />);

    const panel = screen.getByTestId('document-data-modal-panel');
    expect(panel).toHaveClass('document-data-modal-panel--project');
    expect(screen.getByTestId('document-data-brand-disabled')).toBeInTheDocument();
    expect(screen.getByText(copy.documentDataCompositionHeading)).toBeInTheDocument();
    expect(screen.getByText(copy.documentDataStructureHeading)).toBeInTheDocument();
  });
});
