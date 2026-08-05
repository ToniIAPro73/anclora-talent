import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { EditorialMapPanel } from './EditorialMapPanel';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { addProjectChapter, createProjectRecord, deleteProjectChapter } from '@/lib/projects/factories';
import { buildImportedDocumentSeed } from '@/lib/projects/import-pipeline';

const copy = resolveLocaleMessages('es').project;

function buildProjectWithOutline() {
  const importedDocument = buildImportedDocumentSeed({
    fileName: 'libro.md',
    mimeType: 'text/markdown',
    text: [
      '# Capítulo uno',
      '',
      'Contenido uno.',
      '',
      '# Capítulo dos',
      '',
      'Contenido dos.',
    ].join('\n'),
  });

  return createProjectRecord('user-1', { title: importedDocument.title, importedDocument });
}

describe('EditorialMapPanel — M6 structure diff', () => {
  test('marks a deleted chapter as removed in the detected column', () => {
    const project = buildProjectWithOutline();
    const secondChapterId = project.document.chapters.find((c) => c.title === 'Capítulo dos')!.id;
    const withDeletion = deleteProjectChapter(project, secondChapterId);

    render(<EditorialMapPanel copy={copy} pageSummaries={[]} project={withDeletion} />);

    const removedEntry = screen.getByText('Capítulo dos');
    expect(removedEntry.closest('article')).toHaveTextContent(copy.editorialMapRemovedMeta);
  });

  test('marks a manually added chapter as added in the final column', () => {
    const project = buildProjectWithOutline();
    const withAddition = addProjectChapter(project, 'Capítulo extra');

    render(<EditorialMapPanel copy={copy} pageSummaries={[]} project={withAddition} />);

    const addedEntry = screen.getByText(/Capítulo extra/);
    expect(addedEntry.closest('article')).toHaveTextContent(copy.editorialMapAddedMeta);
  });

  test('matched chapters show no diff meta', () => {
    const project = buildProjectWithOutline();

    render(<EditorialMapPanel copy={copy} pageSummaries={[]} project={project} />);

    const matchedEntry = screen.getByText('Capítulo uno');
    expect(matchedEntry.closest('article')).not.toHaveTextContent(copy.editorialMapAddedMeta);
    expect(matchedEntry.closest('article')).not.toHaveTextContent(copy.editorialMapRemovedMeta);
  });
});
