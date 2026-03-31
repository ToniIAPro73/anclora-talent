import { fireEvent, render, screen } from '@testing-library/react';
import { DocumentStoreProvider, useDocumentStore } from './store';

function PreviewProbe() {
  const { document } = useDocumentStore();
  const chapter = document.chapters[0];
  const paragraph = chapter.blocks.find((block) => block.type === 'paragraph');

  if (!paragraph || paragraph.type !== 'paragraph') {
    throw new Error('Expected a paragraph block in the first chapter');
  }

  return <p data-testid="preview-probe">{paragraph.content}</p>;
}

function EditorProbe() {
  const { document, updateBlockContent } = useDocumentStore();
  const chapter = document.chapters[0];
  const paragraph = chapter.blocks.find((block) => block.type === 'paragraph');

  if (!paragraph || paragraph.type !== 'paragraph') {
    throw new Error('Expected a paragraph block in the first chapter');
  }

  return (
    <button
      type="button"
      onClick={() => updateBlockContent(chapter.id, paragraph.id, 'Texto actualizado desde editor')}
    >
      Mutate
    </button>
  );
}

test('shares the same canonical document state between editor and preview consumers', async () => {
  render(
    <DocumentStoreProvider>
      <PreviewProbe />
      <EditorProbe />
    </DocumentStoreProvider>,
  );

  expect(screen.getByTestId('preview-probe')).toHaveTextContent('Capítulo 1');

  fireEvent.click(screen.getByRole('button', { name: 'Mutate' }));

  expect(screen.getByTestId('preview-probe')).toHaveTextContent('Texto actualizado desde editor');
});
