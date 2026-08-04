import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProjectRecord } from '@/lib/projects/types';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { resolveDocumentRules } from '@/lib/compose/rules';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import { DocumentRulesPanel } from './DocumentRulesPanel';
import { DocumentHealthPanel } from './DocumentHealthPanel';

const saveProjectRulesAction = vi.fn().mockResolvedValue({ ok: true });
vi.mock('@/lib/projects/actions', () => ({
  saveProjectRulesAction: (formData: FormData) => saveProjectRulesAction(formData),
}));

// F3: the health panel imports the governed-AI server actions; stub them (and
// the server-only/router chain) so the panel tests stay UI-only.
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/ai/actions', () => ({
  proposeViolationFixAction: vi.fn(),
  acceptAiProposalAction: vi.fn(),
  rejectAiProposalAction: vi.fn(),
  analyzeCoherenceAction: vi.fn(),
}));

const copy = resolveLocaleMessages('es').project;

function fakeProject(): ProjectRecord {
  return {
    id: 'proj-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'book',
    title: 'Book',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    document: {
      id: 'doc-1',
      title: 'Book',
      subtitle: '',
      author: 'Anon',
      language: 'es',
      chapters: [],
      rules: null,
    },
    cover: {
      id: 'c1',
      title: 'Book',
      subtitle: '',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'b1',
      title: 'Book',
      body: '',
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };
}

describe('DocumentRulesPanel', () => {
  beforeEach(() => saveProjectRulesAction.mockClear());

  it('renders with sensible defaults and saves them as JSON', async () => {
    render(<DocumentRulesPanel project={fakeProject()} copy={copy} />);
    expect(screen.getByTestId('document-rules-panel')).toBeInTheDocument();
    expect(screen.getByTestId('rules-keep-table')).toBeChecked();

    fireEvent.click(screen.getByTestId('rules-save-button'));
    await waitFor(() => expect(saveProjectRulesAction).toHaveBeenCalled());
    const formData = saveProjectRulesAction.mock.calls[0][0] as FormData;
    const rules = JSON.parse(String(formData.get('rules')));
    expect(rules).toEqual(resolveDocumentRules());
    expect(formData.get('projectId')).toBe('proj-1');
  });

  it('persists toggled rules (keepTogether.table off)', async () => {
    render(<DocumentRulesPanel project={fakeProject()} copy={copy} />);
    fireEvent.click(screen.getByTestId('rules-keep-table'));
    fireEvent.click(screen.getByTestId('rules-save-button'));
    await waitFor(() => expect(saveProjectRulesAction).toHaveBeenCalled());
    const rules = JSON.parse(String((saveProjectRulesAction.mock.calls[0][0] as FormData).get('rules')));
    expect(rules.keepTogether.table).toBe(false);
  });

  it('print preset enables odd-page chapter starts', () => {
    render(<DocumentRulesPanel project={fakeProject()} copy={copy} />);
    fireEvent.click(screen.getByTestId('rules-preset-print'));
    fireEvent.click(screen.getByTestId('rules-save-button'));
    return waitFor(() => {
      const rules = JSON.parse(String((saveProjectRulesAction.mock.calls[0][0] as FormData).get('rules')));
      expect(rules.chapterStartsOnOddPage).toBe(true);
    });
  });
});

describe('DocumentHealthPanel', () => {
  it('shows zero violations state', () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[]} copy={copy} />);
    expect(screen.getByTestId('document-health-counter')).toHaveTextContent('0');
    expect(screen.queryByTestId('document-health-violations')).not.toBeInTheDocument();
  });

  it('lists violations with page reference and rule', () => {
    const violations = [
      { page: 13, blockId: 't1', rule: 'keepTogether.table', message: 'Tabla dividida' },
    ];
    render(<DocumentHealthPanel project={fakeProject()} violations={violations} copy={copy} />);
    expect(screen.getByTestId('document-health-counter')).toHaveTextContent('1 violaciones');
    expect(screen.getByTestId('document-health-violations')).toHaveTextContent('keepTogether.table');
    expect(screen.getByTestId('document-health-violations')).toHaveTextContent('pág. 14');
  });
});

describe('DocumentHealthPanel — pre-flight por canal (F1)', () => {
  const checks: PreflightCheck[] = [
    { channel: 'kdp', severity: 'error', rule: 'kdp.metadata.author', params: {} },
    {
      channel: 'kobo',
      severity: 'warning',
      rule: 'kobo.a11y.headingJump',
      params: { from: '1', to: '3' },
      page: 4,
      blockId: 'h3',
    },
  ];

  it('renders channel chips and the selected channel checks with localized message', () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[]} copy={copy} checks={checks} />);
    expect(screen.getByTestId('document-preflight')).toBeInTheDocument();
    expect(screen.getByTestId('preflight-tab-kdp')).toHaveTextContent('KDP');
    expect(screen.getByTestId('preflight-tab-ingramspark')).toHaveTextContent('IngramSpark');
    expect(screen.getByTestId('preflight-tab-kobo')).toHaveTextContent('Kobo');
    // KDP selected by default: the error check renders with severity + copy.
    const list = screen.getByTestId('document-preflight-checks');
    expect(list).toHaveTextContent('kdp.metadata.author');
    expect(list).toHaveTextContent('KDP exige autor/a en los metadatos de la publicación.');
    expect(screen.getByTestId('preflight-check-severity')).toHaveTextContent('error');
  });

  it('switches channels via chips and links page-anchored checks to the preview', () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[]} copy={copy} checks={checks} />);
    fireEvent.click(screen.getByTestId('preflight-tab-kobo'));
    const list = screen.getByTestId('document-preflight-checks');
    expect(list).toHaveTextContent('kobo.a11y.headingJump');
    expect(list).toHaveTextContent('Salto de jerarquía de encabezados (H1 → H3)');
    const link = screen.getByRole('link', { name: 'pág. 5' });
    expect(link).toHaveAttribute('href', '/projects/proj-1/preview');
  });

  it('shows the empty state for a clean channel and stays hidden without checks', () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[]} copy={copy} checks={[]} />);
    expect(screen.getByTestId('document-preflight')).toHaveTextContent(
      'Sin incidencias. El documento está listo para este canal.',
    );
  });

  it('does not render the section when checks are not provided', () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[]} copy={copy} />);
    expect(screen.queryByTestId('document-preflight')).not.toBeInTheDocument();
  });
});

describe('ProductMetadataPanel', () => {
  it('submits DocumentMetadata JSON with parsed keywords', async () => {
    const saveProjectMetadataAction = vi.fn().mockResolvedValue({ ok: true });
    vi.doMock('@/lib/projects/actions', () => ({
      saveProjectMetadataAction: (formData: FormData) => saveProjectMetadataAction(formData),
    }));
    const { ProductMetadataPanel } = await import('./ProductMetadataPanel');
    render(<ProductMetadataPanel project={fakeProject()} copy={copy} />);
    fireEvent.change(screen.getByTestId('metadata-isbn-input'), {
      target: { value: '978-84-1111111-1-1' },
    });
    fireEvent.change(screen.getByTestId('metadata-keywords-input'), {
      target: { value: 'novela, ensayo , poesía' },
    });
    fireEvent.click(screen.getByTestId('metadata-save-button'));
    await waitFor(() => expect(saveProjectMetadataAction).toHaveBeenCalled());
    const metadata = JSON.parse(
      String((saveProjectMetadataAction.mock.calls[0][0] as FormData).get('metadata')),
    );
    expect(metadata.isbn).toBe('978-84-1111111-1-1');
    expect(metadata.keywords).toEqual(['novela', 'ensayo', 'poesía']);
    expect(metadata.title).toBe('Book');
  });
});

describe('DocumentHealthPanel — live diff badge (C5)', () => {
  it('shows the recomposed-since badge and the structural diff summary', () => {
    const diff = {
      chapterShifts: [{ chapterId: 'c4', title: 'Capítulo 4', fromPage: 61, toPage: 63 }],
      tocDelta: 2,
      newViolations: [{ page: 3, blockId: 't1', rule: 'keepTogether.table', message: 'x' }],
      pageCountDelta: 2,
    };
    render(
      <DocumentHealthPanel
        project={fakeProject()}
        violations={diff.newViolations}
        copy={copy}
        diff={diff}
        recomposedFromPage={61}
      />,
    );
    expect(screen.getByTestId('document-health-recomposed-badge')).toHaveTextContent(
      'Recompuesto desde la pág. 61',
    );
    const banner = screen.getByTestId('document-health-diff');
    expect(banner).toHaveTextContent('Capítulo 4: pág. 61 → 63');
    expect(banner).toHaveTextContent('+2 entradas al índice');
    expect(banner).toHaveTextContent('1 violaciones nuevas');
  });

  it('hides badge and banner when there is no diff', () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[]} copy={copy} diff={null} />);
    expect(screen.queryByTestId('document-health-recomposed-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('document-health-diff')).not.toBeInTheDocument();
  });
});

describe('DocumentHealthPanel — revert banner (F0.3)', () => {
  it('shows the banner with the revert action and calls onRevert', () => {
    const onRevert = vi.fn();
    render(
      <DocumentHealthPanel
        project={fakeProject()}
        violations={[]}
        copy={copy}
        revert={{ chapterTitle: 'Capítulo 2', pending: false, onRevert }}
      />,
    );
    const banner = screen.getByTestId('document-health-revert');
    expect(banner).toHaveTextContent('Capítulo 2');
    fireEvent.click(screen.getByRole('button', { name: 'Revertir' }));
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it('disables the action while the revert is pending', () => {
    render(
      <DocumentHealthPanel
        project={fakeProject()}
        violations={[]}
        copy={copy}
        revert={{ chapterTitle: 'Capítulo 2', pending: true, onRevert: vi.fn() }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Revirtiendo…' })).toBeDisabled();
  });

  it('stays hidden when there is nothing revertible', () => {
    render(
      <DocumentHealthPanel project={fakeProject()} violations={[]} copy={copy} revert={null} />,
    );
    expect(screen.queryByTestId('document-health-revert')).not.toBeInTheDocument();
  });
});

describe('DocumentHealthPanel — recomposition telemetry (F0.2)', () => {
  it('shows the rolling count, last duration and average', () => {
    render(
      <DocumentHealthPanel
        project={fakeProject()}
        violations={[]}
        copy={copy}
        telemetry={{ count: 2, lastMs: 60, avgMs: 90 }}
      />,
    );
    expect(screen.getByTestId('document-health-telemetry')).toHaveTextContent(
      '2 recomposiciones · última 60 ms · media 90 ms',
    );
  });

  it('stays hidden without measurements', () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[]} copy={copy} />);
    expect(screen.queryByTestId('document-health-telemetry')).not.toBeInTheDocument();
  });
});
