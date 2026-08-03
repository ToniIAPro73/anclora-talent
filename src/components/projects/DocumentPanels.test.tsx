import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProjectRecord } from '@/lib/projects/types';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { resolveDocumentRules } from '@/lib/compose/rules';
import { DocumentRulesPanel } from './DocumentRulesPanel';
import { DocumentHealthPanel } from './DocumentHealthPanel';

const saveProjectRulesAction = vi.fn().mockResolvedValue({ ok: true });
vi.mock('@/lib/projects/actions', () => ({
  saveProjectRulesAction: (formData: FormData) => saveProjectRulesAction(formData),
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
