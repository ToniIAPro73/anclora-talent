import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { DocumentChapter } from '@/lib/projects/types';
import { ReimportDialog } from './ReimportDialog';

const reimportProjectAction = vi.fn().mockResolvedValue({
  ok: true,
  changedChapterIds: ['ch1'],
  addedChapterTitles: ['Capítulo nuevo'],
  keptStaleChapterTitles: ['Apéndice'],
});
vi.mock('@/lib/projects/actions', () => ({
  reimportProjectAction: (formData: FormData) => reimportProjectAction(formData),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const copy = resolveLocaleMessages('es').project;

const chapters: DocumentChapter[] = [
  { id: 'ch1', order: 1, title: 'Introducción', blocks: [] },
  { id: 'ch2', order: 2, title: 'Apéndice', blocks: [] },
];

function selectDocxFile() {
  const input = screen.getByTestId('reimport-file-input');
  const file = new File(['docx-bytes'], 'book-v2.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('ReimportDialog (C6)', () => {
  beforeEach(() => {
    reimportProjectAction.mockClear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ chapterTitles: ['Introducción', 'Capítulo nuevo'] }),
      }),
    );
  });

  it('previews the structural diff before confirming', async () => {
    render(
      <ReimportDialog isOpen projectId="proj-1" chapters={chapters} copy={copy} onClose={() => {}} />,
    );
    selectDocxFile();
    const preview = await screen.findByTestId('reimport-diff-preview');
    expect(preview).toHaveTextContent('1 capítulos se actualizarán');
    expect(preview).toHaveTextContent('1 capítulos se añadirán');
    expect(preview).toHaveTextContent('1 capítulos se conservan');
    expect(reimportProjectAction).not.toHaveBeenCalled();
  });

  it('merges on confirm and shows the actual merge result', async () => {
    render(
      <ReimportDialog isOpen projectId="proj-1" chapters={chapters} copy={copy} onClose={() => {}} />,
    );
    selectDocxFile();
    await screen.findByTestId('reimport-diff-preview');
    fireEvent.click(screen.getByTestId('reimport-confirm-button'));
    await waitFor(() => expect(reimportProjectAction).toHaveBeenCalled());
    const result = await screen.findByTestId('reimport-result');
    expect(result).toHaveTextContent('Reimportación completada');
    const formData = reimportProjectAction.mock.calls[0][0] as FormData;
    expect(formData.get('projectId')).toBe('proj-1');
    expect(formData.get('sourceDocument')).toBeInstanceOf(File);
  });
});
